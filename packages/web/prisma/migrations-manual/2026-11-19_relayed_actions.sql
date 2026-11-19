-- Additive-only (2026-11-19, doc 129 Phase 5c): combined Stellar actions
-- (XLM → Savings, Savings → XLM) that one signature covers. Their relayed
-- steps live in "relayed_steps" (transferId = this table's id). Nothing
-- existing changes. Run once on staging, then on production, before
-- turning NEXT_PUBLIC_STELLAR_PERMISSIONS on.

CREATE TABLE IF NOT EXISTS "relayed_actions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "network" TEXT NOT NULL DEFAULT 'mainnet',
    "kind" TEXT NOT NULL,
    "account" TEXT NOT NULL,
    "planJson" TEXT NOT NULL,
    "firstTxHash" TEXT,
    "status" TEXT NOT NULL DEFAULT 'CREATED',
    "errorDetail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "relayed_actions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "relayed_actions_userId_createdAt_idx" ON "relayed_actions"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "relayed_actions_status_idx" ON "relayed_actions"("status");
