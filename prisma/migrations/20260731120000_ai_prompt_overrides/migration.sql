-- CreateTable
CREATE TABLE "ai_prompt_overrides" (
    "override_id" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "line_of_business" TEXT NOT NULL DEFAULT '__global__',
    "guidance" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "changed_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_prompt_overrides_pkey" PRIMARY KEY ("override_id")
);

-- CreateTable
CREATE TABLE "ai_prompt_override_revisions" (
    "revision_id" TEXT NOT NULL,
    "override_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "changes" JSONB NOT NULL,
    "changed_by" TEXT NOT NULL,
    "changed_by_email" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_prompt_override_revisions_pkey" PRIMARY KEY ("revision_id")
);

-- CreateIndex
CREATE INDEX "ai_prompt_overrides_operation_is_active_idx" ON "ai_prompt_overrides"("operation", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "ai_prompt_overrides_operation_line_of_business_key" ON "ai_prompt_overrides"("operation", "line_of_business");

-- CreateIndex
CREATE INDEX "ai_prompt_override_revisions_override_id_created_at_idx" ON "ai_prompt_override_revisions"("override_id", "created_at");

-- AddForeignKey
ALTER TABLE "ai_prompt_override_revisions" ADD CONSTRAINT "ai_prompt_override_revisions_override_id_fkey" FOREIGN KEY ("override_id") REFERENCES "ai_prompt_overrides"("override_id") ON DELETE RESTRICT ON UPDATE CASCADE;

