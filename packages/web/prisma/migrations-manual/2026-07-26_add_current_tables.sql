-- Additive-only: create the 5 current-architecture tables on the consolidation target.
-- NO drops, NO alters to existing/old tables. Reviewed extract of prisma migrate diff 2026-07-26.

-- CreateTable
CREATE TABLE "vault_deposits" (
    "id" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "vaultAddress" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "feeAmount" TEXT,
    "feeTxHash" TEXT,
    "txHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vault_deposits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "swap_logs" (
    "id" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "tokenInAddress" TEXT NOT NULL,
    "tokenOutAddress" TEXT NOT NULL,
    "tokenInSymbol" TEXT,
    "tokenOutSymbol" TEXT,
    "amountIn" TEXT NOT NULL,
    "amountOut" TEXT NOT NULL,
    "feeAmount" TEXT,
    "feeTxHash" TEXT,
    "txHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "swap_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cctp_transfers" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "network" TEXT NOT NULL DEFAULT 'mainnet',
    "direction" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CREATED',
    "sourceDomain" INTEGER NOT NULL,
    "destDomain" INTEGER NOT NULL,
    "amountWire" TEXT NOT NULL,
    "srcAsset" TEXT NOT NULL,
    "dstAsset" TEXT NOT NULL,
    "srcAmount" TEXT,
    "dstAmount" TEXT,
    "srcAddress" TEXT NOT NULL,
    "destAddress" TEXT NOT NULL,
    "srcSwapTxHash" TEXT,
    "burnTxHash" TEXT,
    "eventNonce" TEXT,
    "messageHex" TEXT,
    "attestationHex" TEXT,
    "mintTxHash" TEXT,
    "dstSwapTxHash" TEXT,
    "gasTopUpTxHash" TEXT,
    "quoteJson" TEXT,
    "errorDetail" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cctp_transfers_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "turnkey_wallets" (
    "id" TEXT NOT NULL,
    "supabaseUid" TEXT NOT NULL,
    "subOrgId" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "bitcoinAddress" TEXT,
    "ethereumAddress" TEXT,
    "solanaAddress" TEXT,
    "stellarAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "turnkey_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vault_deposits_walletAddress_vaultAddress_idx" ON "vault_deposits"("walletAddress", "vaultAddress");

-- CreateIndex
CREATE INDEX "swap_logs_walletAddress_idx" ON "swap_logs"("walletAddress");

-- CreateIndex
CREATE INDEX "cctp_transfers_userId_idx" ON "cctp_transfers"("userId");

-- CreateIndex
CREATE INDEX "cctp_transfers_status_idx" ON "cctp_transfers"("status");

-- CreateIndex
CREATE INDEX "cctp_transfers_burnTxHash_idx" ON "cctp_transfers"("burnTxHash");

-- CreateIndex
CREATE INDEX "moneygram_transactions_supabaseUid_idx" ON "moneygram_transactions"("supabaseUid");

-- CreateIndex
CREATE INDEX "moneygram_transactions_walletAddress_idx" ON "moneygram_transactions"("walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "turnkey_wallets_supabaseUid_key" ON "turnkey_wallets"("supabaseUid");

-- CreateIndex
CREATE UNIQUE INDEX "turnkey_wallets_subOrgId_key" ON "turnkey_wallets"("subOrgId");

-- CreateIndex
CREATE INDEX "turnkey_wallets_supabaseUid_idx" ON "turnkey_wallets"("supabaseUid");
