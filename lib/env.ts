import { z } from "zod";

const envSchema = z.object({
    // Database
    DATABASE_URL: z.string().optional(),

    // Authentication
    AUTH_SECRET: z.string().min(1),
    NEXTAUTH_URL: z.string().optional(),

    // AI / Gemini
    GEMINI_API_KEY: z.string().optional(),

    // Storage (Optional - Defaults to local /public/uploads)
    STORAGE_BUCKET: z.string().optional(),
    GOOGLE_APPLICATION_CREDENTIALS: z.string().optional(),

    // Payments (Stripe)
    STRIPE_SECRET_KEY: z.string().optional(),
    STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),

    // Email / Brevo
    BREVO_API_KEY: z.string().optional(),
    SENDER_EMAIL: z.string().email().optional(),
    BREVO_LIST_ID_USERS: z.string().optional(),
    BREVO_LIST_ID_AGENTS: z.string().optional(),

    // Redis / Upstash
    UPSTASH_REDIS_REST_URL: z.string().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),

    // App
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export const env = envSchema.parse(process.env);

export type Env = z.infer<typeof envSchema>;
