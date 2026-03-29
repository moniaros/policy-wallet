/*
  Warnings:

  - The data in the decimal columns will be cast from `Decimal` to `Decimal(65,30)`.
    PostgreSQL preserves values during this widening cast, but verify in staging first.
*/

-- AlterTable: widen opportunity decimal precision
ALTER TABLE "opportunities" ALTER COLUMN "estimated_premium" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "estimated_commission" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "quoted_premium" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "won_premium" SET DATA TYPE DECIMAL(65,30);

-- AlterTable: timestamp precision alignment
ALTER TABLE "policy_documents" ALTER COLUMN "extracted_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tenant_memberships" ALTER COLUMN "invited_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "joined_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "translation_cache" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);
