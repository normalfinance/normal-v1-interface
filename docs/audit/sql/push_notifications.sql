-- Push notifications for the mobile app — additive schema.
--
-- WHY: the mobile app needs to tell a user their money moved while the app is
-- closed. Every completion the app cares about is already settled SERVER-side
-- by a cron (cctp_transfers by cctp-advance, send_logs by fee-escrow-sweep),
-- so the cron is the right place to notify. LI.FI native swaps had no server
-- follow-up at all, hence the bridgeStatus columns and the new cron.
--
-- Contract with mobile (2026-09-16): tokens stored PER DEVICE, unique on
-- token alone; notifications claimed with a compare-and-swap on notifiedAt so
-- a row is pushed exactly once even if two cron ticks overlap.
--
-- RUN ORDER: this file BEFORE deploying the code that reads the columns.
-- SAFE TO RE-RUN.

-- 1) Devices ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS push_devices (
  id               TEXT PRIMARY KEY,
  token            TEXT NOT NULL UNIQUE,
  "supabaseUid"    TEXT NOT NULL,
  platform         TEXT NOT NULL,                 -- 'ios' | 'android'
  "deviceName"     TEXT,
  "appVariant"     TEXT NOT NULL DEFAULT 'prod',  -- 'dev' (APNs sandbox) | 'prod'
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "disabledAt"     TIMESTAMP(3),
  "disabledReason" TEXT
);
CREATE INDEX IF NOT EXISTS push_devices_supabaseUid_idx ON push_devices ("supabaseUid");
CREATE INDEX IF NOT EXISTS push_devices_disabledAt_idx  ON push_devices ("disabledAt");

-- 2) notifiedAt on the three settled tables -----------------------------------
ALTER TABLE cctp_transfers ADD COLUMN IF NOT EXISTS "notifiedAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS cctp_transfers_notifiedAt_idx ON cctp_transfers ("notifiedAt");

ALTER TABLE send_logs ADD COLUMN IF NOT EXISTS "notifiedAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS send_logs_notifiedAt_idx ON send_logs ("notifiedAt");

ALTER TABLE swap_logs ADD COLUMN IF NOT EXISTS "bridgeStatus"    TEXT;
ALTER TABLE swap_logs ADD COLUMN IF NOT EXISTS "bridgeCheckedAt" TIMESTAMP(3);
ALTER TABLE swap_logs ADD COLUMN IF NOT EXISTS "notifiedAt"      TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS swap_logs_bridgeStatus_idx ON swap_logs ("bridgeStatus");

-- 3) BACKFILL: mark everything that is ALREADY terminal as notified -----------
-- Without this the first cron tick would push a notification for every swap
-- and send in the table's history. The code also ignores rows older than 48h,
-- but the data should say the truth on its own.
UPDATE cctp_transfers
   SET "notifiedAt" = CURRENT_TIMESTAMP
 WHERE "notifiedAt" IS NULL
   AND (status IN ('COMPLETED', 'REFUNDED', 'FAILED') OR "dstSwapTxHash" IS NOT NULL);

UPDATE send_logs
   SET "notifiedAt" = CURRENT_TIMESTAMP
 WHERE "notifiedAt" IS NULL
   AND status IN ('confirmed', 'failed', 'abandoned');

-- Legacy LI.FI rows keep bridgeStatus NULL: the cron only follows rows the
-- record route marked 'PENDING' from now on, so nothing historical is pushed.

-- 4) OPTIONAL — owner lookup indexes for the send sweep --------------------------
-- The send sweep maps send_logs.walletAddress → turnkey_wallets.<chain address>
-- (EVM compared case-insensitively, Solana/Stellar exactly). At thousands of
-- wallets these keep that from being a sequential scan per tick:
--
--   CREATE INDEX IF NOT EXISTS turnkey_wallets_eth_lower_idx ON turnkey_wallets (lower("ethereumAddress"));
--   CREATE INDEX IF NOT EXISTS turnkey_wallets_solana_idx    ON turnkey_wallets ("solanaAddress");
--   CREATE INDEX IF NOT EXISTS turnkey_wallets_stellar_idx   ON turnkey_wallets ("stellarAddress");

-- 5) OPTIONAL — close the double-record hole on swap_logs.txHash -------------
-- /api/lifi/record now refuses a txHash it already holds, so this index is
-- belt-and-braces. It FAILS if duplicates already exist; check first:
--
--   SELECT "txHash", count(*) FROM swap_logs
--    WHERE "txHash" IS NOT NULL GROUP BY "txHash" HAVING count(*) > 1;
--
-- Only when that returns no rows:
--
--   CREATE UNIQUE INDEX IF NOT EXISTS swap_logs_txHash_key ON swap_logs ("txHash");
--
-- (Postgres allows many NULLs under a unique index, so Soroswap rows that
-- have no txHash yet are unaffected.) Prisma keeps a plain index on txHash so
-- `prisma db push` never has to reconcile this.
