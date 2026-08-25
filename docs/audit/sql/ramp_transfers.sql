-- 89 F2 — money in flight: one record per ramp handoff. ADDITIVE; run in
-- Supabase before deploying the F2 code (the code degrades gracefully without
-- it, but no banners/rows appear until this exists).
--
-- WHY: after a user leaves for Coinbase/MoonPay, nothing tracked the gap
-- between "provider says done" and "the chain shows the balance" — the most
-- alarming window in the product. MoneyGram already mirrors its transactions;
-- this table is the same idea for every other provider.
--
-- The row is written BEFORE the handoff (a closed tab cannot lose it), and
-- walletAddress is the WalletChoice-selected wallet, so the banner can say
-- WHICH wallet the money is heading to.
--
-- SAFE TO RE-RUN.

CREATE TABLE IF NOT EXISTS ramp_transfers (
  id                TEXT PRIMARY KEY,
  "supabaseUid"     TEXT NOT NULL,
  network           TEXT NOT NULL DEFAULT 'mainnet',
  direction         TEXT NOT NULL,           -- 'onramp' | 'offramp'
  provider          TEXT NOT NULL,           -- 'coinbase' | 'moonpay' | ...
  asset             TEXT NOT NULL,           -- 'USDC', 'XLM', 'BTC', ...
  chain             TEXT NOT NULL,           -- 'stellar' | 'bitcoin' | ...
  "walletAddress"   TEXT NOT NULL,
  "amountExpected"  TEXT,                    -- NULL until the provider tells us
  "amountFinal"     TEXT,
  status            TEXT NOT NULL DEFAULT 'committed',
  "providerRef"     TEXT,
  "baselineBalance" TEXT,                    -- destination balance AT COMMIT
  "failureReason"   TEXT,
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "settledAt"       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS ramp_transfers_uid_idx
  ON ramp_transfers ("supabaseUid");
CREATE INDEX IF NOT EXISTS ramp_transfers_status_idx
  ON ramp_transfers (status);
CREATE INDEX IF NOT EXISTS ramp_transfers_uid_status_idx
  ON ramp_transfers ("supabaseUid", status);

-- Verify (expect: the table exists, zero rows):
-- SELECT count(*) FROM ramp_transfers;
