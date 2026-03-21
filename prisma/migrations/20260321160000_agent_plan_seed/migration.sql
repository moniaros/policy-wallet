-- Seed agent subscription plans
-- Stripe price IDs are placeholders — replace with real IDs after creating products in Stripe dashboard

INSERT INTO "plans" ("plan_id", "plan_type", "name", "display_name", "price", "currency", "billing_period", "entitlements", "stripe_price_id")
VALUES
    ('agent-free', 'agent', 'agent_free', 'Agent Free', 0, 'EUR', 'monthly', '{"maxCustomers":10,"aiAnalysesPerMonth":5,"monthlyTokenBudget":500000}', NULL),
    ('agent-starter', 'agent', 'agent_starter', 'Agent Starter', 19.99, 'EUR', 'monthly', '{"maxCustomers":100,"aiAnalysesPerMonth":50,"monthlyTokenBudget":2000000}', 'price_agent_starter_placeholder'),
    ('agent-pro', 'agent', 'agent_pro', 'Agent Pro', 49.99, 'EUR', 'monthly', '{"maxCustomers":500,"aiAnalysesPerMonth":200,"monthlyTokenBudget":10000000}', 'price_agent_pro_placeholder'),
    ('agent-agency', 'agent', 'agency', 'Agency', 99.99, 'EUR', 'monthly', '{"maxCustomers":null,"aiAnalysesPerMonth":null,"monthlyTokenBudget":25000000}', 'price_agency_placeholder')
ON CONFLICT ("plan_id") DO UPDATE SET
    "price" = EXCLUDED."price",
    "display_name" = EXCLUDED."display_name",
    "entitlements" = EXCLUDED."entitlements";
