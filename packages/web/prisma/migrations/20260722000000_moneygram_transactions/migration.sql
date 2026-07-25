-- CreateTable
CREATE TABLE "moneygram_transactions" (
    "id" TEXT NOT NULL,
    "supabaseUid" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'incomplete',
    "amount" TEXT,
    "externalTransactionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "moneygram_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "moneygram_transactions_supabaseUid_idx" ON "moneygram_transactions"("supabaseUid");

-- CreateIndex
CREATE INDEX "moneygram_transactions_walletAddress_idx" ON "moneygram_transactions"("walletAddress");
