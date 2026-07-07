import type { MetadataRoute } from "next"
import { getSiteOrigin } from "@/lib/seo/site"

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
    "/sentry-example-page",
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
