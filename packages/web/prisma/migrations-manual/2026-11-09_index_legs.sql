-- Additive-only (2026-11-09): the crypto index's legs. Nothing existing changes.
-- The purchase itself is a row in cctp_transfers with direction 'stellar_to_index'.
-- Run once on staging, then on production, before turning NEXT_PUBLIC_INDEX_ENABLED on.

CREATE TABLE IF NOT EXISTS "index_legs" (
    "id" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "weightBps" INTEGER NOT NULL,
    "amountWire" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "dstSwapTxHash" TEXT,
    "dstAmount" TEXT,
    "errorDetail" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "index_legs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "index_legs_purchaseId_symbol_key" ON "index_legs"("purchaseId", "symbol");
CREATE INDEX IF NOT EXISTS "index_legs_userId_idx" ON "index_legs"("userId");
CREATE INDEX IF NOT EXISTS "index_legs_status_idx" ON "index_legs"("status");
