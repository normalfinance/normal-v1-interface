-- AlterTable
ALTER TABLE "normal_contract_events" ADD COLUMN     "operation_body" TEXT,
ADD COLUMN     "operation_result_code" TEXT,
ADD COLUMN     "operation_type" TEXT;
