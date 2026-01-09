-- AlterTable
ALTER TABLE "normal_contract_events" RENAME CONSTRAINT "normal_contracts_pkey" TO "normal_contract_events_pkey",
ADD COLUMN     "transaction_index" INTEGER,
ALTER COLUMN "transaction_hash" DROP NOT NULL,
ALTER COLUMN "transaction_account" DROP NOT NULL,
ALTER COLUMN "transaction_successful" DROP NOT NULL;

-- CreateTable
CREATE TABLE "linked_wallets" (
    "id" TEXT NOT NULL,
    "supabaseUid" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "walletName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "custodyChoice" TEXT,
    "encryptedMnemonic" TEXT,
    "encryptionIV" TEXT,
    "encryptionSalt" TEXT,
    "custodyConsentEmail" TEXT,
    "custodyConsentDate" TIMESTAMP(3),

    CONSTRAINT "linked_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_rsa_keys" (
    "id" TEXT NOT NULL,
    "supabaseUid" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "encryptedPrivateKey" TEXT NOT NULL,
    "privateKeyIV" TEXT NOT NULL,
    "privateKeySalt" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_rsa_keys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "linked_wallets_supabaseUid_idx" ON "linked_wallets"("supabaseUid");

-- CreateIndex
CREATE UNIQUE INDEX "linked_wallets_supabaseUid_walletAddress_key" ON "linked_wallets"("supabaseUid", "walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "user_rsa_keys_supabaseUid_key" ON "user_rsa_keys"("supabaseUid");
