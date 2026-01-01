-- CreateTable
CREATE TABLE "index_funds" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "totalShares" TEXT NOT NULL,
    "totalMints" TEXT NOT NULL,
    "totalRedemptions" TEXT NOT NULL,
    "baseNav" TEXT NOT NULL,
    "sharePrice" TEXT NOT NULL,
    "tvlUsd" DECIMAL(24,8) NOT NULL,
    "netFlow" TEXT NOT NULL,
    "managerAddress" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "tokenAddress" TEXT NOT NULL,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "index_funds_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "index_funds_address_key" ON "index_funds"("address");

-- CreateIndex
CREATE INDEX "index_funds_tvlUsd_idx" ON "index_funds"("tvlUsd" DESC);

-- CreateIndex
CREATE INDEX "index_funds_managerAddress_idx" ON "index_funds"("managerAddress");

-- CreateIndex
CREATE INDEX "index_funds_isPublic_idx" ON "index_funds"("isPublic");
