import { z } from "zod";

const envSchema = z.object({
    // Database
    DATABASE_URL: z.string().optional(),

    // Authentication
    AUTH_SECRET: z.string().min(1),
    NEXTAUTH_URL: z.string().optional(),

    // AI / Gemini — the 2.5 family retires 2026-10-16; defaults live on the
    // 3-family. Extraction + gap run on gemini-3-flash-preview (Pro-grade
    // reasoning at ~40% of 2.5-pro cost); the retry fallback is the STABLE
    // GA gemini-3.5-flash so a preview-model hiccup lands on solid ground.
    GEMINI_API_KEY: z.string().optional(),
    GEMINI_MODEL_EXTRACTION: z.string().default("gemini-3-flash-preview"),
    GEMINI_MODEL_GAP_ANALYSIS: z.string().default("gemini-3-flash-preview"),
    // Clarity/QA/translation are language work — flash-lite is sufficient.
    GEMINI_MODEL_CLARITY_ANALYSIS: z.string().default("gemini-3.1-flash-lite"),
    GEMINI_MODEL_QA: z.string().default("gemini-3.1-flash-lite"),
    GEMINI_MODEL_FALLBACK: z.string().default("gemini-3.5-flash"),
    GEMINI_MODEL_TRANSLATION: z.string().default("gemini-3.1-flash-lite"),
    OPENAI_API_KEY: z.string().optional(),
    OPENAI_MODEL_EXTRACTION: z.string().default("gpt-4.1-mini"),
    OPENAI_MODEL_GAP_ANALYSIS: z.string().default("gpt-4.1-mini"),
    OPENAI_MODEL_CLARITY_ANALYSIS: z.string().default("gpt-4.1-mini"),
    OPENAI_MODEL_QA: z.string().default("gpt-4.1-mini"),
    // Anthropic / Claude (premium failover). claude-sonnet-4-20250514 is
    // deprecated (retirement announced for 2026) and claude-haiku-4-20250414
    // never existed — both 404 exactly when the failover chain is needed.
    ANTHROPIC_API_KEY: z.string().optional(),
    CLAUDE_MODEL_EXTRACTION: z.string().default("claude-sonnet-5"),
    CLAUDE_MODEL_GAP_ANALYSIS: z.string().default("claude-sonnet-5"),
    CLAUDE_MODEL_CLARITY_ANALYSIS: z.string().default("claude-sonnet-5"),
    CLAUDE_MODEL_QA: z.string().default("claude-haiku-4-5"),
    // Per-provider model-fallback targets (the router's model-fallback branch).
    // Before this, only Gemini had a fallback model — a transient failure on
    // Claude/OpenAI skipped the cheaper same-provider retry. Haiku / gpt-4.1-mini
    // are the stable, cheap landing spots for their family.
    CLAUDE_MODEL_FALLBACK: z.string().default("claude-haiku-4-5"),
    OPENAI_MODEL_FALLBACK: z.string().default("gpt-4.1-mini"),
    FF_AI_FAILOVER_OPENAI: z.string().default("false"),
    FF_AI_DEGRADED_COMPLETION: z.string().default("true"),
    FF_AI_REMEDIATION_ALERTS: z.string().default("false"),
    FF_AI_REMEDIATION_CANARY_MODE: z.enum(["off", "internal", "10", "50", "100"]).default("internal"),
    AI_ALLOW_FULL_FAILOVER: z.string().default("true"),
    AI_INCIDENT_SLACK_WEBHOOK_URL: z.string().url().optional(),
    AI_INCIDENT_PAGERDUTY_ROUTING_KEY: z.string().optional(),
    AI_INCIDENT_PAGERDUTY_EVENT_URL: z.string().url().default("https://events.pagerduty.com/v2/enqueue"),

    // Storage (Optional - Defaults to local /public/uploads)
    STORAGE_BUCKET: z.string().optional(),
    GOOGLE_APPLICATION_CREDENTIALS: z.string().optional(),

    // Payments (Stripe)
    STRIPE_SECRET_KEY: z.string().optional(),
    STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
    STRIPE_PREMIUM_PRICE_ID: z.string().optional(),
    STRIPE_PLUS_PRICE_ID: z.string().optional(),

    // Email / Brevo
    BREVO_API_KEY: z.string().optional(),
    SENDER_EMAIL: z.string().email().optional(),
    SENDER_NAME: z.string().optional(),
    BREVO_LIST_ID_USERS: z.string().optional(),
    BREVO_LIST_ID_AGENTS: z.string().optional(),
    // Footer-newsletter subscribers are added to this Brevo list.
    BREVO_LIST_ID_NEWSLETTER: z.string().optional(),
    ADMIN_NOTIFICATION_EMAIL: z.string().email().optional(),

    // CRM / HubSpot (Optional)
    HUBSPOT_ACCESS_TOKEN: z.string().min(1).optional(),

    // Redis / Upstash
    UPSTASH_REDIS_REST_URL: z.string().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
    // Escape hatch: allow a single-instance production deploy without Upstash.
    RATELIMIT_ALLOW_LOCAL: z.string().optional(),

    // RevenueCat (webhooks)
    REVENUECAT_WEBHOOK_AUTH_VALUE: z.string().min(1).optional(),

    // App
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

    // Supabase
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

const parsedEnv = envSchema.parse(process.env)

if (parsedEnv.NODE_ENV === "production") {
    const missing: string[] = []

    if (parsedEnv.FF_AI_FAILOVER_OPENAI === "true" && !parsedEnv.OPENAI_API_KEY) {
        missing.push("OPENAI_API_KEY")
    }

    // Distributed rate limiting is a security control, not an optimization: without
    // Upstash, each serverless instance keeps its own in-memory counter, so the
    // effective limit multiplies by the instance count (near fail-open at scale).
    // Refuse to boot production without it. Set RATELIMIT_ALLOW_LOCAL=1 to override
    // for a deliberately single-instance deploy.
    if (parsedEnv.RATELIMIT_ALLOW_LOCAL !== "1") {
        if (!parsedEnv.UPSTASH_REDIS_REST_URL) missing.push("UPSTASH_REDIS_REST_URL")
        if (!parsedEnv.UPSTASH_REDIS_REST_TOKEN) missing.push("UPSTASH_REDIS_REST_TOKEN")
    }

    if (missing.length > 0) {
        throw new Error(
            `Missing required production environment variables for enabled features: ${missing.join(", ")}`
        )
    }
}

export const env = parsedEnv

export type Env = z.infer<typeof envSchema>;
