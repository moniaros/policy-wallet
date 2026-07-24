import type { MetadataRoute } from "next"
import { getSiteOrigin, isIndexableDeployment } from "@/lib/seo/site"

/**
 * Crawl policy for search engines AND AI answer engines.
 *
 * The marketing site must be fully crawlable; the authenticated product
 * surface and APIs must not. AI crawlers (GPTBot, ClaudeBot, PerplexityBot,
 * Google-Extended, etc.) are explicitly welcomed on public pages — being
 * citable by answer engines is a distribution channel for PolicyWallet,
 * not a risk: policyholder data lives behind auth, which is disallowed
 * and unreachable without a session anyway.
 */

const DISALLOWED_PATHS = [
    "/api/",
    "/auth/",
    "/wallet",
    "/admin",
    "/account",
    "/onboarding",
    "/upgrade",
    "/agent",
    "/api-docs",
    "/monitoring",
    "/invite/",
]

const AI_CRAWLERS = [
    "GPTBot",
    "OAI-SearchBot",
    "ChatGPT-User",
    "ClaudeBot",
    "Claude-User",
    "anthropic-ai",
    "PerplexityBot",
    "Perplexity-User",
    "Google-Extended",
    "Applebot-Extended",
    "cohere-ai",
    "meta-externalagent",
]

export default function robots(): MetadataRoute.Robots {
    const origin = getSiteOrigin()

    // Preview/branch deploys are never crawlable — the vercel.app copy must
    // not compete with the production domain (see also X-Robots-Tag in
    // proxy.ts and the robots meta in app/layout.tsx).
    if (!isIndexableDeployment()) {
        return {
            rules: [{ userAgent: "*", disallow: "/" }],
        }
    }

    return {
        rules: [
            {
                userAgent: "*",
                allow: "/",
                disallow: DISALLOWED_PATHS,
            },
            ...AI_CRAWLERS.map((userAgent) => ({
                userAgent,
                allow: "/",
                disallow: DISALLOWED_PATHS,
            })),
        ],
        sitemap: `${origin}/sitemap.xml`,
    }
}
