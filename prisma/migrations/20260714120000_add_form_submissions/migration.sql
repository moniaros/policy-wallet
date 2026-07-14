-- CreateTable
CREATE TABLE "form_submissions" (
    "submission_id" TEXT NOT NULL,
    "form_type" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "subject" TEXT,
    "message" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'el',
    "source" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "email_sent" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "form_submissions_pkey" PRIMARY KEY ("submission_id")
);

-- CreateIndex
CREATE INDEX "form_submissions_form_type_created_at_idx" ON "form_submissions"("form_type", "created_at");
