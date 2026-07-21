-- Owner decision #8 (2026-07-21 GDPR review): the DeletionRequest row is the
-- accountability record proving an erasure happened — it must survive even a
-- hypothetical hard delete of the user row. Cascade -> SetNull.

-- DropForeignKey
ALTER TABLE "deletion_requests" DROP CONSTRAINT "deletion_requests_user_id_fkey";

-- AlterColumn
ALTER TABLE "deletion_requests" ALTER COLUMN "user_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "deletion_requests" ADD CONSTRAINT "deletion_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;
