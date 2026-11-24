-- CreateEnum
CREATE TYPE "PipelineStep" AS ENUM ('UPLOAD', 'NORMALIZE', 'FILTER', 'VALIDATE', 'MAP', 'DELIVER');

-- CreateEnum
CREATE TYPE "RunKind" AS ENUM ('INITIAL', 'RETRY');

-- CreateEnum
CREATE TYPE "RunStatus" AS ENUM ('RUNNING', 'COMPLETED', 'COMPLETED_WITH_FAILURES', 'FAILED');

-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('PENDING', 'PROCESSING', 'DELIVERED', 'FAILED');

-- CreateEnum
CREATE TYPE "AttemptOutcome" AS ENUM ('DELIVERED', 'ALREADY_DELIVERED', 'SKIPPED', 'FAILED');

-- CreateTable
CREATE TABLE "delivery_notes_exports" (
    "id" UUID NOT NULL,
    "content" BYTEA NOT NULL,
    "uploaded_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delivery_notes_exports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_notes" (
    "id" UUID NOT NULL,
    "export_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "number" TEXT,
    "raw" JSONB NOT NULL,

    CONSTRAINT "delivery_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "runs" (
    "id" UUID NOT NULL,
    "export_id" UUID NOT NULL,
    "carrier" TEXT NOT NULL,
    "kind" "RunKind" NOT NULL,
    "parent_run_id" UUID,
    "status" "RunStatus" NOT NULL DEFAULT 'RUNNING',
    "total" INTEGER NOT NULL DEFAULT 0,
    "delivered" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "skipped" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMPTZ(3),

    CONSTRAINT "runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipments" (
    "id" UUID NOT NULL,
    "carrier" TEXT NOT NULL,
    "external_ref" TEXT NOT NULL,
    "delivery_note_id" UUID NOT NULL,
    "status" "ShipmentStatus" NOT NULL DEFAULT 'PENDING',
    "last_completed_step" "PipelineStep",
    "failed_step" "PipelineStep",
    "reason_code" TEXT,
    "reason_message" TEXT,
    "normalized" JSONB,
    "content_hash" TEXT,
    "payload" JSONB,
    "tracking_id" TEXT,
    "delivered_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attempts" (
    "id" UUID NOT NULL,
    "run_id" UUID NOT NULL,
    "delivery_note_id" UUID NOT NULL,
    "shipment_id" UUID,
    "from_step" "PipelineStep" NOT NULL,
    "reached_step" "PipelineStep" NOT NULL,
    "outcome" "AttemptOutcome" NOT NULL,
    "failed_step" "PipelineStep",
    "reason_code" TEXT,
    "reason_message" TEXT,
    "technical_detail" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "delivery_notes_number_idx" ON "delivery_notes"("number");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_notes_export_id_position_key" ON "delivery_notes"("export_id", "position");

-- CreateIndex
CREATE INDEX "runs_started_at_id_idx" ON "runs"("started_at", "id");

-- CreateIndex
CREATE INDEX "shipments_status_idx" ON "shipments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "shipments_carrier_external_ref_key" ON "shipments"("carrier", "external_ref");

-- CreateIndex
CREATE INDEX "attempts_run_id_outcome_idx" ON "attempts"("run_id", "outcome");

-- CreateIndex
CREATE INDEX "attempts_shipment_id_idx" ON "attempts"("shipment_id");

-- AddForeignKey
ALTER TABLE "delivery_notes" ADD CONSTRAINT "delivery_notes_export_id_fkey" FOREIGN KEY ("export_id") REFERENCES "delivery_notes_exports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "runs" ADD CONSTRAINT "runs_export_id_fkey" FOREIGN KEY ("export_id") REFERENCES "delivery_notes_exports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "runs" ADD CONSTRAINT "runs_parent_run_id_fkey" FOREIGN KEY ("parent_run_id") REFERENCES "runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_delivery_note_id_fkey" FOREIGN KEY ("delivery_note_id") REFERENCES "delivery_notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_delivery_note_id_fkey" FOREIGN KEY ("delivery_note_id") REFERENCES "delivery_notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
