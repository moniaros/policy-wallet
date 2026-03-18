import { db } from "@/lib/db"
import { env } from "@/lib/env"

type CheckStatus = "pass" | "warn" | "fail"

type SyntheticCheck = {
    id: string
    status: CheckStatus
    message: string
    details?: Record<string, unknown>
}

export type SyntheticLaunchSnapshot = {
    generatedAt: string
    overallStatus: CheckStatus
    checks: SyntheticCheck[]
}

function resolveOverallStatus(checks: SyntheticCheck[]): CheckStatus {
    if (checks.some((check) => check.status === "fail")) return "fail"
    if (checks.some((check) => check.status === "warn")) return "warn"
    return "pass"
}

export async function runSyntheticLaunchChecks(): Promise<SyntheticLaunchSnapshot> {
    const checks: SyntheticCheck[] = []

    try {
        const dbStart = Date.now()
        await db.$queryRaw`SELECT 1`
        checks.push({
            id: "database_connectivity",
            status: "pass",
            message: "Database connectivity check passed.",
            details: { latencyMs: Date.now() - dbStart },
        })
    } catch (error) {
        checks.push({
            id: "database_connectivity",
            status: "fail",
            message: "Database connectivity check failed.",
            details: { error: error instanceof Error ? error.message : String(error) },
        })
    }

    const authReady = Boolean(env.AUTH_SECRET && env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    checks.push({
        id: "auth_configuration",
        status: authReady ? "pass" : "fail",
        message: authReady
            ? "Auth configuration is present."
            : "Auth configuration is incomplete.",
    })

    const aiPrimaryReady = Boolean(env.GEMINI_API_KEY || env.OPENAI_API_KEY)
    const aiFailoverRequired = env.FF_AI_FAILOVER_OPENAI === "true"
    const aiFailoverReady = !aiFailoverRequired || Boolean(env.OPENAI_API_KEY)
    checks.push({
        id: "ai_configuration",
        status: aiPrimaryReady && aiFailoverReady ? "pass" : "fail",
        message: aiPrimaryReady && aiFailoverReady
            ? "AI provider configuration is valid."
            : "AI provider configuration is incomplete for enabled features.",
        details: {
            hasGeminiKey: Boolean(env.GEMINI_API_KEY),
            hasOpenAiKey: Boolean(env.OPENAI_API_KEY),
            failoverEnabled: aiFailoverRequired,
        },
    })

    const billingCoreReady = Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET)
    checks.push({
        id: "billing_configuration",
        status: billingCoreReady ? "pass" : "warn",
        message: billingCoreReady
            ? "Stripe billing configuration is present."
            : "Stripe billing configuration is partially missing.",
        details: {
            hasStripeSecret: Boolean(env.STRIPE_SECRET_KEY),
            hasStripeWebhookSecret: Boolean(env.STRIPE_WEBHOOK_SECRET),
            hasRevenueCatWebhookAuth: Boolean(env.REVENUECAT_WEBHOOK_AUTH_VALUE),
        },
    })

    const cronSecretReady = Boolean(process.env.CRON_SECRET)
    checks.push({
        id: "cron_secret",
        status: cronSecretReady ? "pass" : "warn",
        message: cronSecretReady
            ? "CRON_SECRET is configured."
            : "CRON_SECRET is not configured.",
    })

    const pendingSlaCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const [staleOpenDsr, staleFailedWebhooks] = await Promise.all([
        Promise.all([
            db.dataExportRequest.count({
                where: {
                    status: { in: ["requested", "processing"] },
                    requestedAt: { lte: pendingSlaCutoff },
                },
            }),
            db.deletionRequest.count({
                where: {
                    status: { in: ["requested", "in_review", "approved", "processing"] },
                    requestedAt: { lte: pendingSlaCutoff },
                },
            }),
        ]).then(([exportStale, deletionStale]) => exportStale + deletionStale),
        db.processedWebhookEvent.count({
            where: {
                status: "failed",
                processedAt: { lte: pendingSlaCutoff },
            },
        }),
    ])

    checks.push({
        id: "dsr_backlog",
        status: staleOpenDsr === 0 ? "pass" : "warn",
        message: staleOpenDsr === 0
            ? "No stale DSR requests beyond 24h."
            : "Stale DSR requests beyond 24h detected.",
        details: { staleOpenDsr },
    })

    checks.push({
        id: "webhook_failures",
        status: staleFailedWebhooks === 0 ? "pass" : "warn",
        message: staleFailedWebhooks === 0
            ? "No stale failed webhook events."
            : "Stale failed webhook events detected.",
        details: { staleFailedWebhooks },
    })

    return {
        generatedAt: new Date().toISOString(),
        overallStatus: resolveOverallStatus(checks),
        checks,
    }
}
