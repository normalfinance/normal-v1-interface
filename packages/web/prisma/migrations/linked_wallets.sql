-- Migration: Add linked_wallets table for Normal wallet auth linking
-- Apply this SQL in the Supabase Dashboard SQL Editor

-- Create linked_wallets table
CREATE TABLE IF NOT EXISTS "linked_wallets" (
    "id" TEXT NOT NULL,
    "supabaseUid" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "walletName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "linked_wallets_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint on (supabaseUid, walletAddress)
CREATE UNIQUE INDEX "linked_wallets_supabaseUid_walletAddress_key" ON "linked_wallets"("supabaseUid", "walletAddress");

-- Create index on supabaseUid for fast lookups
CREATE INDEX "linked_wallets_supabaseUid_idx" ON "linked_wallets"("supabaseUid");


