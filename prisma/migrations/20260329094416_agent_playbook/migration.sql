-- AlterTable
ALTER TABLE "recommendation_instances" ADD COLUMN     "product_id" TEXT;

-- CreateTable
CREATE TABLE "insurance_products" (
    "product_id" TEXT NOT NULL,
    "line_of_business" TEXT NOT NULL,
    "name" JSONB NOT NULL,
    "description" JSONB NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'individual',
    "estimated_annual_premium" DECIMAL(10,2) NOT NULL,
    "premium_range_low" DECIMAL(10,2),
    "premium_range_high" DECIMAL(10,2),
    "key_benefits" JSONB,
    "ideal_profile_tags" TEXT[],
    "urgency_for_profiles" TEXT NOT NULL DEFAULT 'medium',
    "greek_market_popularity" INTEGER NOT NULL DEFAULT 50,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "insurance_products_pkey" PRIMARY KEY ("product_id")
);

-- CreateIndex
CREATE INDEX "insurance_products_line_of_business_is_active_idx" ON "insurance_products"("line_of_business", "is_active");

-- CreateIndex
CREATE INDEX "insurance_products_is_active_sort_order_idx" ON "insurance_products"("is_active", "sort_order");

-- AddForeignKey
ALTER TABLE "recommendation_instances" ADD CONSTRAINT "recommendation_instances_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "insurance_products"("product_id") ON DELETE SET NULL ON UPDATE CASCADE;
