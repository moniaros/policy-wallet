import Stripe from "stripe";
import { env } from "./env";

// Lazy initialization to avoid build-time errors when API key is missing
let stripeInstance: Stripe | null = null;

export const getStripe = () => {
    if (!stripeInstance) {
        const key = env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;

        // Stripe requires a valid-looking key even for initialization if using newer versions
        // If no key is found, and we're in production, it will fail when called.
        // During build, we provide a placeholder that matches the expected format to avoid crash.
        const apiKey = key && key.startsWith('sk_') ? key : "sk_test_4eC39HqLyjWDarjtT1zdp7dc";

        stripeInstance = new Stripe(apiKey, {
            apiVersion: "2024-12-18.acacia" as any,
            typescript: true,
        });
    }
    return stripeInstance;
};

// For backward compatibility (not recommended for build-time safe code)
export const stripe = getStripe();
