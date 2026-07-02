-- Adds the Solana address column to Turnkey wallets (lazy per-chain provisioning)
ALTER TABLE "turnkey_wallets" ADD COLUMN IF NOT EXISTS "solanaAddress" TEXT;
