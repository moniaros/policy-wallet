-- CreateEnum
CREATE TYPE "ConsentType" AS ENUM ('cookie', 'terms', 'privacy');

-- CreateEnum
CREATE TYPE "DataExportStatus" AS ENUM ('requested', 'processing', 'completed', 'failed', 'expired');

-- CreateEnum
CREATE TYPE "DeletionRequestStatus" AS ENUM ('requested', 'in_review', 'approved', 'processing', 'completed', 'rejected', 'failed');

-- AlterTable
ALTER TABLE "users"
ADD COLUMN "consent_locale" TEXT,
ADD COLUMN "consent_updated_at" TIMESTAMP(3),
ADD COLUMN "cookie_consent_version" TEXT,
ADD COLUMN "privacy_version_accepted" TEXT,
ADD COLUMN "terms_version_accepted" TEXT;

-- CreateTable
CREATE TABLE "consent_audits" (
    "consent_id" TEXT NOT NULL,
    "user_id" TEXT,
    "consent_type" "ConsentType" NOT NULL,
    "policy_version" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "categories" JSONB,
    "accepted" BOOLEAN NOT NULL DEFAULT true,
    "accepted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "consent_audits_pkey" PRIMARY KEY ("consent_id")
);

-- CreateTable
CREATE TABLE "data_export_requests" (
    "export_request_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" "DataExportStatus" NOT NULL DEFAULT 'requested',
    "request_source" TEXT NOT NULL DEFAULT 'self_service',
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "download_token" TEXT,
    "payload_json" JSONB,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "data_export_requests_pkey" PRIMARY KEY ("export_request_id")
);

-- CreateTable
CREATE TABLE "deletion_requests" (
    "deletion_request_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" "DeletionRequestStatus" NOT NULL DEFAULT 'requested',
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "legal_basis" TEXT,
    "retention_notes" TEXT,
    "operator_notes" TEXT,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "deletion_requests_pkey" PRIMARY KEY ("deletion_request_id")
);

-- CreateTable
CREATE TABLE "processed_webhook_events" (
    "webhook_event_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "source_route" TEXT,
    "status" TEXT NOT NULL DEFAULT 'processed',
    "result" JSONB,
    "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "processed_webhook_events_pkey" PRIMARY KEY ("webhook_event_id")
);

-- CreateIndex
CREATE INDEX "consent_audits_user_id_created_at_idx" ON "consent_audits"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "consent_audits_consent_type_created_at_idx" ON "consent_audits"("consent_type", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "data_export_requests_download_token_key" ON "data_export_requests"("download_token");

-- CreateIndex
CREATE INDEX "data_export_requests_user_id_requested_at_idx" ON "data_export_requests"("user_id", "requested_at");

-- CreateIndex
CREATE INDEX "data_export_requests_status_requested_at_idx" ON "data_export_requests"("status", "requested_at");

-- CreateIndex
CREATE INDEX "deletion_requests_user_id_requested_at_idx" ON "deletion_requests"("user_id", "requested_at");

-- CreateIndex
CREATE INDEX "deletion_requests_status_requested_at_idx" ON "deletion_requests"("status", "requested_at");

-- CreateIndex
CREATE INDEX "processed_webhook_events_provider_processed_at_idx" ON "processed_webhook_events"("provider", "processed_at");

-- CreateIndex
CREATE UNIQUE INDEX "processed_webhook_events_provider_event_id_key" ON "processed_webhook_events"("provider", "event_id");

-- AddForeignKey
ALTER TABLE "consent_audits" ADD CONSTRAINT "consent_audits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_export_requests" ADD CONSTRAINT "data_export_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deletion_requests" ADD CONSTRAINT "deletion_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
