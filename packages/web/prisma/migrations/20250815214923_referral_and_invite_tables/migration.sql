-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referrals" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "referrerId" TEXT NOT NULL,
    "refereeId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "usedAt" TIMESTAMP(3),
    "source" TEXT,
    "campaign" TEXT,

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_actions" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "referralId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "amount" TEXT,
    "tokenSymbol" TEXT,
    "metadata" JSONB,

    CONSTRAINT "referral_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "testnet_users" (
    "id" TEXT NOT NULL,
    "inviteCode" TEXT NOT NULL,
    "walletAddress" TEXT,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT,

    CONSTRAINT "testnet_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "normal_contract_events_testnet" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "contract_id" TEXT,
    "topics" TEXT,
    "data" TEXT,
    "in_successful_contract_call" BOOLEAN NOT NULL,
    "transaction_hash" TEXT NOT NULL,
    "transaction_account" TEXT NOT NULL,
    "transaction_fee_account" TEXT,
    "transaction_successful" BOOLEAN NOT NULL,
    "ledger_sequence" BIGINT NOT NULL,
    "ledger_hash" TEXT NOT NULL,
    "ledger_closed_at" TIMESTAMP(6) NOT NULL,
    "ledger_signature" TEXT,

    CONSTRAINT "normal_contracts_testnet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_walletAddress_key" ON "users"("walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "referrals_code_key" ON "referrals"("code");

-- CreateIndex
CREATE UNIQUE INDEX "referral_actions_userId_referralId_action_key" ON "referral_actions"("userId", "referralId", "action");

-- CreateIndex
CREATE UNIQUE INDEX "testnet_users_inviteCode_key" ON "testnet_users"("inviteCode");

-- CreateIndex
CREATE UNIQUE INDEX "testnet_users_walletAddress_key" ON "testnet_users"("walletAddress");

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_refereeId_fkey" FOREIGN KEY ("refereeId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_actions" ADD CONSTRAINT "referral_actions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_actions" ADD CONSTRAINT "referral_actions_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "referrals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
