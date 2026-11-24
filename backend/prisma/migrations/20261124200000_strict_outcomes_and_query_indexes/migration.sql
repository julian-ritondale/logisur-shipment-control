-- An idempotent delivery is a delivery: fold ALREADY_DELIVERED into DELIVERED.
UPDATE "attempts" SET "outcome" = 'DELIVERED' WHERE "outcome" = 'ALREADY_DELIVERED';

-- AlterEnum
BEGIN;
CREATE TYPE "AttemptOutcome_new" AS ENUM ('DELIVERED', 'SKIPPED', 'FAILED');
ALTER TABLE "attempts" ALTER COLUMN "outcome" TYPE "AttemptOutcome_new" USING ("outcome"::text::"AttemptOutcome_new");
ALTER TYPE "AttemptOutcome" RENAME TO "AttemptOutcome_old";
ALTER TYPE "AttemptOutcome_new" RENAME TO "AttemptOutcome";
DROP TYPE "public"."AttemptOutcome_old";
COMMIT;

-- AlterTable
ALTER TABLE "attempts" ADD COLUMN     "issues" JSONB,
ADD COLUMN     "tracking_id" TEXT;

-- AlterTable
ALTER TABLE "delivery_notes" ADD COLUMN     "carrier" TEXT;

-- CreateIndex
CREATE INDEX "attempts_reason_code_idx" ON "attempts"("reason_code");

-- CreateIndex
CREATE INDEX "delivery_notes_carrier_idx" ON "delivery_notes"("carrier");

-- CreateIndex
CREATE INDEX "runs_export_id_idx" ON "runs"("export_id");

-- CreateIndex
CREATE INDEX "runs_status_idx" ON "runs"("status");

