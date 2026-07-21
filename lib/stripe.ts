import Stripe from "stripe";
import { env } from "./env";

// Lazy initialization to avoid build-time errors when API key is missing
let stripeInstance: Stripe | null = null;

export const getStripe = () => {
    if (!stripeInstance) {
        const key = env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;

        // A missing/malformed key must never silently fall back at runtime in
        // production — billing calls would hit a placeholder account and
        // "work" until card entry while subscription sync silently diverges.
        // The build phase still gets a placeholder so `next build` can import
        // this module without the secret present.
        if (!key || !key.startsWith("sk_")) {
            if (
                process.env.NODE_ENV === "production" &&
                process.env.NEXT_PHASE !== "phase-production-build"
            ) {
                throw new Error(
                    "STRIPE_SECRET_KEY missing or malformed — refusing to initialize billing with a fallback key"
                );
            }
        }

        stripeInstance = new Stripe(key && key.startsWith("sk_") ? key : "sk_test_placeholder_build_only", {
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

// For backward compatibility (not recommended for build-time safe code)
export const stripe = getStripe();
