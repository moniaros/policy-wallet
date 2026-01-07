import { z } from "zod";

const envSchema = z.object({
    // Database
    DATABASE_URL: z.string().url(),

    // Authentication
    AUTH_SECRET: z.string().min(1),
    NEXTAUTH_URL: z.string().url().optional(),

    // AI / Gemini
    GEMINI_API_KEY: z.string().min(1),

    // Storage (Optional - Defaults to local /public/uploads)
    STORAGE_BUCKET: z.string().optional(),
    GOOGLE_APPLICATION_CREDENTIALS: z.string().optional(),

    // Payments (Stripe)
    STRIPE_SECRET_KEY: z.string().min(1),
    STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),

    // Email (Brevo / SMTP)
    BREVO_API_KEY: z.string().min(1).optional(),
    SENDER_EMAIL: z.string().email().default("noreply@policywallet.gr"),

    // Redis (Rate Limiting)
    UPSTASH_REDIS_REST_URL: z.string().url().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),

    // App
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export const env = envSchema.parse(process.env);

export type Env = z.infer<typeof envSchema>;
