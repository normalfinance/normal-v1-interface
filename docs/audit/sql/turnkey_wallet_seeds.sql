-- 83 phase 1 — one row per Turnkey WALLET (seed), additive.
--
-- WHY: turnkey_wallets has UNIQUE(supabaseUid), i.e. the schema says "a user
-- has exactly one wallet". Turnkey allows many inside one sub-organization,
-- and importing a mnemonic creates a second. The import route overwrote
-- walletId but filled address columns only when EMPTY, leaving one row
-- describing two seeds (walletId = imported, stellarAddress = original) —
-- and the export dialog exports by walletId, so the recovery phrase shown
-- did not open the wallet displayed.
--
-- turnkey_wallets KEEPS its meaning: the user's sub-org + their PRIMARY
-- wallet (created at signup, the one new chain accounts derive on). This
-- table is the full list. Signing is unaffected: Turnkey signs by
-- organizationId + address and never takes a walletId.
--
-- SAFE TO RE-RUN.

CREATE TABLE IF NOT EXISTS turnkey_wallet_seeds (
  id                TEXT PRIMARY KEY,
  "supabaseUid"     TEXT NOT NULL,
  "walletId"        TEXT NOT NULL,
  label             TEXT,
  origin            TEXT NOT NULL DEFAULT 'created',   -- 'created' | 'imported'
  "isPrimary"       BOOLEAN NOT NULL DEFAULT false,
  "stellarAddress"  TEXT,
  "bitcoinAddress"  TEXT,
  "ethereumAddress" TEXT,
  "solanaAddress"   TEXT,
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT turnkey_wallet_seeds_uid_wallet_key UNIQUE ("supabaseUid", "walletId")
);

CREATE INDEX IF NOT EXISTS turnkey_wallet_seeds_uid_idx
  ON turnkey_wallet_seeds ("supabaseUid");
CREATE INDEX IF NOT EXISTS turnkey_wallet_seeds_stellar_idx
  ON turnkey_wallet_seeds ("stellarAddress");

-- Backfill: today's single wallet becomes each user's primary seed.
-- Rows created by import-init before a wallet exists carry walletId '' and
-- are skipped — they get their seed when the wallet is actually created.
INSERT INTO turnkey_wallet_seeds
  (id, "supabaseUid", "walletId", label, origin, "isPrimary",
   "stellarAddress", "bitcoinAddress", "ethereumAddress", "solanaAddress", "createdAt")
SELECT
  gen_random_uuid()::text,
  "supabaseUid",
  "walletId",
  'Normal wallet',
  'created',
  true,
  "stellarAddress",
  "bitcoinAddress",
  "ethereumAddress",
  "solanaAddress",
  "createdAt"
FROM turnkey_wallets
WHERE "walletId" <> ''
ON CONFLICT ("supabaseUid", "walletId") DO NOTHING;

-- Verify (expect: seeds >= wallets-with-a-walletId, and no user without one)
-- SELECT
--   (SELECT count(*) FROM turnkey_wallets WHERE "walletId" <> '') AS wallets,
--   (SELECT count(*) FROM turnkey_wallet_seeds)                    AS seeds,
--   (SELECT count(*) FROM turnkey_wallets w
--      WHERE w."walletId" <> '' AND NOT EXISTS (
--        SELECT 1 FROM turnkey_wallet_seeds s
--        WHERE s."supabaseUid" = w."supabaseUid" AND s."walletId" = w."walletId"
--      ))                                                          AS missing;
