/*
  Warnings:

  - You are about to drop the `normal_contract_events_testnet` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "normal_contract_events_testnet";

-- CreateTable
CREATE TABLE "normal_contract_events" (
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

    CONSTRAINT "normal_contracts_pkey" PRIMARY KEY ("id")
);
