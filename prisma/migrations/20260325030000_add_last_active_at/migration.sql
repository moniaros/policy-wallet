-- AlterTable: Add last_active_at to users for engagement tracking
ALTER TABLE "users" ADD COLUMN "last_active_at" TIMESTAMP(3);
