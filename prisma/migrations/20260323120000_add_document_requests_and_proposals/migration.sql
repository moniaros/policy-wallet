-- CreateTable: document_requests
CREATE TABLE "document_requests" (
    "document_request_id" TEXT NOT NULL,
    "thread_id" TEXT NOT NULL,
    "relationship_id" TEXT NOT NULL,
    "requested_by_user_id" TEXT NOT NULL,
    "document_type" TEXT NOT NULL,
    "instruction" TEXT,
    "urgency" TEXT NOT NULL DEFAULT 'normal',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "due_date" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "uploaded_document_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_requests_pkey" PRIMARY KEY ("document_request_id")
);

-- CreateTable: proposals
CREATE TABLE "proposals" (
    "proposal_id" TEXT NOT NULL,
    "thread_id" TEXT NOT NULL,
    "relationship_id" TEXT NOT NULL,
    "created_by_user_id" TEXT NOT NULL,
    "proposal_type" TEXT NOT NULL,
    "insurer_name" TEXT NOT NULL,
    "line_of_business" TEXT NOT NULL,
    "premium_amount" DECIMAL(10,2) NOT NULL,
    "premium_currency" TEXT NOT NULL DEFAULT 'EUR',
    "coverage_summary" TEXT NOT NULL,
    "comparison_data" JSONB,
    "plain_language_summary" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "client_response_at" TIMESTAMP(3),
    "e_signature_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proposals_pkey" PRIMARY KEY ("proposal_id")
);

-- CreateIndex: document_requests
CREATE INDEX "document_requests_relationship_id_idx" ON "document_requests"("relationship_id");
CREATE INDEX "document_requests_status_idx" ON "document_requests"("status");
CREATE INDEX "document_requests_due_date_idx" ON "document_requests"("due_date");

-- CreateIndex: proposals
CREATE INDEX "proposals_relationship_id_idx" ON "proposals"("relationship_id");
CREATE INDEX "proposals_status_idx" ON "proposals"("status");

-- AddForeignKey: document_requests
ALTER TABLE "document_requests" ADD CONSTRAINT "document_requests_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "collaboration_threads"("thread_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_requests" ADD CONSTRAINT "document_requests_relationship_id_fkey" FOREIGN KEY ("relationship_id") REFERENCES "customer_relationships"("relationship_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_requests" ADD CONSTRAINT "document_requests_requested_by_user_id_fkey" FOREIGN KEY ("requested_by_user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: proposals
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "collaboration_threads"("thread_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_relationship_id_fkey" FOREIGN KEY ("relationship_id") REFERENCES "customer_relationships"("relationship_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
