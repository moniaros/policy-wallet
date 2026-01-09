import Stripe from "stripe";
import { env } from "./env";

export const stripe = new Stripe(env.STRIPE_SECRET_KEY || "dummy_key_for_build", {
    apiVersion: "2025-01-27.acacia" as any, // Use latest or specific stable version
    typescript: true,
});
