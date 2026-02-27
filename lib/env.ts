import { z } from "zod";

const envSchema = z.object({
    // Database
    DATABASE_URL: z.string().optional(),

    // Authentication
    AUTH_SECRET: z.string().min(1),
    NEXTAUTH_URL: z.string().optional(),

    // AI / Gemini
    GEMINI_API_KEY: z.string().optional(),
    GEMINI_MODEL_EXTRACTION: z.string().default("gemini-2.0-flash-exp"),
    GEMINI_MODEL_GAP_ANALYSIS: z.string().default("gemini-2.0-flash-exp"),
    GEMINI_MODEL_CLARITY_ANALYSIS: z.string().default("gemini-2.0-flash-exp"),
    GEMINI_MODEL_QA: z.string().default("gemini-2.0-flash"),
    GEMINI_MODEL_FALLBACK: z.string().default("gemini-2.0-flash-exp"),

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
    BREVO_LIST_ID_USERS: z.string().optional(),
    BREVO_LIST_ID_AGENTS: z.string().optional(),

    // CRM / HubSpot (Optional)
    HUBSPOT_ACCESS_TOKEN: z.string().min(1).optional(),

    // Redis / Upstash
    UPSTASH_REDIS_REST_URL: z.string().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),

    // RevenueCat (webhooks)
    REVENUECAT_WEBHOOK_AUTH_VALUE: z.string().min(1).optional(),

    // App
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

    // Supabase
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

export const env = envSchema.parse(process.env);

export type Env = z.infer<typeof envSchema>;
