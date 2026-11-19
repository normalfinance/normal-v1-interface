-- Additive-only (2026-11-19, doc 129 Phase 3): pre-signed permissions that
-- Normal's Stellar relayer submits. Nothing existing changes.
-- Run once on staging, then on production, before turning
-- NEXT_PUBLIC_STELLAR_PERMISSIONS on.

CREATE TABLE IF NOT EXISTS "relayed_steps" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "network" TEXT NOT NULL DEFAULT 'mainnet',
    "transferId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "account" TEXT NOT NULL,
    "entryXdr" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "signedXdr" TEXT,
    "expiresLedger" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AWAITING_SIGNATURE',
    "txHash" TEXT,
    "errorDetail" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "relayed_steps_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "relayed_steps_transferId_order_key" ON "relayed_steps"("transferId", "order");
CREATE INDEX IF NOT EXISTS "relayed_steps_status_idx" ON "relayed_steps"("status");
CREATE INDEX IF NOT EXISTS "relayed_steps_userId_idx" ON "relayed_steps"("userId");
