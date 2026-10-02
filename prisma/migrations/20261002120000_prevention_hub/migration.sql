-- CreateTable
CREATE TABLE "prevention_progress" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "policy_id" TEXT NOT NULL,
    "item_key" TEXT NOT NULL,
    "source_version" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "consent_version" TEXT,
    "barrier" TEXT,
    "helpful" BOOLEAN,
    "remind_at" DATE,
    "reminded_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "first_acted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prevention_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prevention_check_ins" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "consent_version" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prevention_check_ins_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "prevention_progress_remind_at_reminded_at_idx" ON "prevention_progress"("remind_at", "reminded_at");

-- CreateIndex
CREATE UNIQUE INDEX "prevention_progress_user_id_item_key_key" ON "prevention_progress"("user_id", "item_key");

-- CreateIndex
CREATE INDEX "prevention_check_ins_user_id_created_at_idx" ON "prevention_check_ins"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "prevention_progress" ADD CONSTRAINT "prevention_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prevention_progress" ADD CONSTRAINT "prevention_progress_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "policies"("policy_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prevention_check_ins" ADD CONSTRAINT "prevention_check_ins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Private owner data; access only through authenticated application operations.
ALTER TABLE "prevention_progress" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "prevention_check_ins" ENABLE ROW LEVEL SECURITY;
