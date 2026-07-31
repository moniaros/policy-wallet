-- CreateTable
CREATE TABLE "ai_runtime_config" (
    "config_id" TEXT NOT NULL,
    "config_key" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'auto',
    "model" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "changed_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_runtime_config_pkey" PRIMARY KEY ("config_id")
);

-- CreateTable
CREATE TABLE "ai_runtime_config_revisions" (
    "revision_id" TEXT NOT NULL,
    "config_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "changes" JSONB NOT NULL,
    "changed_by" TEXT NOT NULL,
    "changed_by_email" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_runtime_config_revisions_pkey" PRIMARY KEY ("revision_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ai_runtime_config_config_key_key" ON "ai_runtime_config"("config_key");

-- CreateIndex
CREATE INDEX "ai_runtime_config_revisions_config_id_created_at_idx" ON "ai_runtime_config_revisions"("config_id", "created_at");

-- AddForeignKey
ALTER TABLE "ai_runtime_config_revisions" ADD CONSTRAINT "ai_runtime_config_revisions_config_id_fkey" FOREIGN KEY ("config_id") REFERENCES "ai_runtime_config"("config_id") ON DELETE RESTRICT ON UPDATE CASCADE;

