-- Token billing system: usage tracking, balances, purchases, monthly summaries

-- CreateTable
CREATE TABLE "token_usage" (
    "usage_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "operation_type" TEXT NOT NULL,
    "policy_id" TEXT,
    "input_tokens" INTEGER NOT NULL,
    "output_tokens" INTEGER NOT NULL,
    "total_tokens" INTEGER NOT NULL,
    "cost_eur" DECIMAL(10,6) NOT NULL,
    "model" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "token_usage_pkey" PRIMARY KEY ("usage_id")
);

-- CreateTable
CREATE TABLE "token_balances" (
    "balance_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "purchased_tokens" BIGINT NOT NULL DEFAULT 0,
    "used_tokens" BIGINT NOT NULL DEFAULT 0,
    "last_purchase_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "token_balances_pkey" PRIMARY KEY ("balance_id")
);

-- CreateTable
CREATE TABLE "token_purchases" (
    "purchase_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tokens_purchased" BIGINT NOT NULL,
    "amount_eur" DECIMAL(10,2) NOT NULL,
    "stripe_payment_intent_id" TEXT,
    "stripe_session_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "token_purchases_pkey" PRIMARY KEY ("purchase_id")
);

-- CreateTable
CREATE TABLE "monthly_token_usage" (
    "summary_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "month" DATE NOT NULL,
    "tier" TEXT NOT NULL,
    "total_tokens" BIGINT NOT NULL,
    "total_cost_eur" DECIMAL(10,2) NOT NULL,
    "subscription_tokens" BIGINT NOT NULL,
    "purchased_tokens_used" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "monthly_token_usage_pkey" PRIMARY KEY ("summary_id")
);

-- CreateIndex
CREATE INDEX "token_usage_user_id_idx" ON "token_usage"("user_id");

-- CreateIndex
CREATE INDEX "token_usage_created_at_idx" ON "token_usage"("created_at");

-- CreateIndex
CREATE INDEX "token_usage_operation_type_idx" ON "token_usage"("operation_type");

-- CreateIndex
CREATE UNIQUE INDEX "token_balances_user_id_key" ON "token_balances"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "token_purchases_stripe_session_id_key" ON "token_purchases"("stripe_session_id");

-- CreateIndex
CREATE INDEX "token_purchases_user_id_idx" ON "token_purchases"("user_id");

-- CreateIndex
CREATE INDEX "token_purchases_created_at_idx" ON "token_purchases"("created_at");

-- CreateIndex
CREATE INDEX "monthly_token_usage_month_idx" ON "monthly_token_usage"("month");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_token_usage_user_id_month_key" ON "monthly_token_usage"("user_id", "month");

-- AddForeignKey
ALTER TABLE "token_usage" ADD CONSTRAINT "token_usage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "token_usage" ADD CONSTRAINT "token_usage_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "policies"("policy_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "token_balances" ADD CONSTRAINT "token_balances_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "token_purchases" ADD CONSTRAINT "token_purchases_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_token_usage" ADD CONSTRAINT "monthly_token_usage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
