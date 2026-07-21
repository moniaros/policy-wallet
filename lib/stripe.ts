import Stripe from "stripe";
import { env } from "./env";

// Lazy initialization to avoid build-time errors when API key is missing
let stripeInstance: Stripe | null = null;

export const getStripe = () => {
    if (!stripeInstance) {
        const key = env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
        // Secret and restricted keys are both valid server-side credentials.
        const looksValid = Boolean(key && (key.startsWith("sk_") || key.startsWith("rk_")));

        // A missing/malformed key must never silently fall back in production —
        // billing calls would hit a placeholder account and "work" until card
        // entry while subscription sync silently diverges. The build phase and
        // non-production environments keep a placeholder so imports and dev
        // flows don't need the secret.
        if (
            !looksValid &&
            process.env.NODE_ENV === "production" &&
            process.env.NEXT_PHASE !== "phase-production-build"
        ) {
            throw new Error(
                "STRIPE_SECRET_KEY missing or malformed — refusing to initialize billing with a fallback key"
            );
        }

        stripeInstance = new Stripe(looksValid ? (key as string) : "sk_test_placeholder_build_only", {
            apiVersion: "2024-12-18.acacia" as any,
            typescript: true,
            // Serverless functions have short budgets; the SDK default of 80s
            // would eat the whole window on a hung connection.
            timeout: 20_000,
            maxNetworkRetries: 2,
        });
    }
    return stripeInstance;
};

// Lazy proxy: importing this module must NEVER throw — non-billing surfaces
// (admin actions, GDPR erasure, account pages) transitively import it, and an
// import-time throw would 500 all of them when only billing is misconfigured.
// The guard in getStripe() fires on the first actual billing property access.
export const stripe: Stripe = new Proxy({} as Stripe, {
    get(_target, prop) {
        const instance = getStripe() as unknown as Record<PropertyKey, unknown>;
        const value = instance[prop];
        return typeof value === "function"
            ? (value as (...args: unknown[]) => unknown).bind(instance)
            : value;
    },
});
