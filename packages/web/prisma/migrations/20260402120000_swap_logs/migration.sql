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
    "txHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "swap_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "swap_logs_walletAddress_idx" ON "swap_logs"("walletAddress");
