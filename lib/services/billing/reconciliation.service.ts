import { db } from "@/lib/db"

type ReconciliationOptions = {
    windowHours?: number
    sampleLimit?: number
}

type ProviderStatusCount = {
    provider: string
    processed: number
    failed: number
    ignored: number
}

type SubscriptionInvoiceSample = {
    subscriptionId: string
    userId: string
    provider: string
    status: string
    currentPeriodEnd: string
    lastInvoiceDate: string | null
}

type InvoiceUserMismatchSample = {
    invoiceId: string
    invoiceUserId: string
    subscriptionId: string
    subscriptionUserId: string
    billingDate: string
}

type FailedWebhookSample = {
    provider: string
    eventId: string
    status: string
    processedAt: string
    sourceRoute: string | null
}

export type BillingReconciliationSnapshot = {
    generatedAt: string
    windowHours: number
    summary: {
        activeSubscriptions: number
        activeStripeMissingExternalId: number
        activeRevenueCatMissingExternalId: number
        activePaidSubscriptionsWithoutRecentInvoice: number
        invoiceUserMismatches: number
        recentWebhookProcessed: number
        recentWebhookFailed: number
        staleFailedWebhookEvents: number
    }
    providerBreakdown: ProviderStatusCount[]
    samples: {
        subscriptionsWithoutRecentInvoice: SubscriptionInvoiceSample[]
        invoiceUserMismatches: InvoiceUserMismatchSample[]
        failedWebhookEvents: FailedWebhookSample[]
    }
    needsAttention: boolean
}

function toIso(value: Date | null | undefined): string | null {
    return value ? value.toISOString() : null
}

function groupWebhookEvents(
    rows: Array<{ provider: string; status: string }>
): ProviderStatusCount[] {
    const map = new Map<string, ProviderStatusCount>()

    for (const row of rows) {
        const existing = map.get(row.provider) || {
            provider: row.provider,
            processed: 0,
            failed: 0,
            ignored: 0,
        }

        if (row.status === "failed") existing.failed += 1
        else if (row.status === "ignored") existing.ignored += 1
        else existing.processed += 1

        map.set(row.provider, existing)
    }

    return Array.from(map.values()).sort((a, b) => a.provider.localeCompare(b.provider))
}

export async function getBillingReconciliationSnapshot(
    options: ReconciliationOptions = {}
): Promise<BillingReconciliationSnapshot> {
    const now = new Date()
    const windowHours = options.windowHours ?? 24
    const sampleLimit = options.sampleLimit ?? 20

    const recentWindowStart = new Date(now.getTime() - windowHours * 60 * 60 * 1000)
    const invoiceFreshnessCutoff = new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000)
    const staleFailedCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    const [
        activeSubscriptions,
        activeStripeMissingExternalId,
        activeRevenueCatMissingExternalId,
        recentWebhookRows,
        staleFailedWebhookEvents,
        failedWebhookRows,
        recentInvoices,
    ] = await Promise.all([
        db.subscription.findMany({
            where: {
                status: {
                    in: ["active", "past_due"],
                },
            },
            select: {
                id: true,
                userId: true,
                provider: true,
                status: true,
                currentPeriodEnd: true,
                plan: {
                    select: {
                        price: true,
                    },
                },
                invoices: {
                    select: {
                        billingDate: true,
                    },
                    orderBy: {
                        billingDate: "desc",
                    },
                    take: 1,
                },
            },
        }),
        db.subscription.count({
            where: {
                provider: "stripe",
                status: {
                    in: ["active", "past_due"],
                },
                stripeSubscriptionId: null,
            },
        }),
        db.subscription.count({
            where: {
                provider: "revenue_cat",
                status: {
                    in: ["active", "past_due"],
                },
                revenueCatIdentifier: null,
            },
        }),
        db.processedWebhookEvent.findMany({
            where: {
                processedAt: {
                    gte: recentWindowStart,
                },
            },
            select: {
                provider: true,
                status: true,
            },
        }),
        db.processedWebhookEvent.count({
            where: {
                status: "failed",
                processedAt: {
                    lte: staleFailedCutoff,
                },
            },
        }),
        db.processedWebhookEvent.findMany({
            where: {
                status: "failed",
            },
            orderBy: {
                processedAt: "desc",
            },
            take: sampleLimit,
            select: {
                provider: true,
                eventId: true,
                status: true,
                processedAt: true,
                sourceRoute: true,
            },
        }),
        db.invoice.findMany({
            orderBy: {
                billingDate: "desc",
            },
            take: 500,
            select: {
                id: true,
                userId: true,
                subscriptionId: true,
                billingDate: true,
                subscription: {
                    select: {
                        userId: true,
                    },
                },
            },
        }),
    ])

    const activePaidSubscriptionsWithoutRecentInvoice = activeSubscriptions.filter((subscription) => {
        const price = Number(subscription.plan.price)
        if (price <= 0) return false

        const lastInvoiceDate = subscription.invoices[0]?.billingDate
        if (!lastInvoiceDate) return true

        return lastInvoiceDate < invoiceFreshnessCutoff
    })

    const invoiceUserMismatches = recentInvoices
        .filter((invoice) => invoice.userId !== invoice.subscription.userId)
        .slice(0, sampleLimit)

    const providerBreakdown = groupWebhookEvents(recentWebhookRows)
    const recentWebhookProcessed = recentWebhookRows.filter((row) => row.status !== "failed").length
    const recentWebhookFailed = recentWebhookRows.filter((row) => row.status === "failed").length

    const summary = {
        activeSubscriptions: activeSubscriptions.length,
        activeStripeMissingExternalId,
        activeRevenueCatMissingExternalId,
        activePaidSubscriptionsWithoutRecentInvoice: activePaidSubscriptionsWithoutRecentInvoice.length,
        invoiceUserMismatches: invoiceUserMismatches.length,
        recentWebhookProcessed,
        recentWebhookFailed,
        staleFailedWebhookEvents,
    }

    const needsAttention =
        summary.activeStripeMissingExternalId > 0 ||
        summary.activeRevenueCatMissingExternalId > 0 ||
        summary.activePaidSubscriptionsWithoutRecentInvoice > 0 ||
        summary.invoiceUserMismatches > 0 ||
        summary.recentWebhookFailed > 0 ||
        summary.staleFailedWebhookEvents > 0

    return {
        generatedAt: now.toISOString(),
        windowHours,
        summary,
        providerBreakdown,
        samples: {
            subscriptionsWithoutRecentInvoice: activePaidSubscriptionsWithoutRecentInvoice
                .slice(0, sampleLimit)
                .map((subscription) => ({
                    subscriptionId: subscription.id,
                    userId: subscription.userId,
                    provider: subscription.provider,
                    status: subscription.status,
                    currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
                    lastInvoiceDate: toIso(subscription.invoices[0]?.billingDate),
                })),
            invoiceUserMismatches: invoiceUserMismatches.map((invoice) => ({
                invoiceId: invoice.id,
                invoiceUserId: invoice.userId,
                subscriptionId: invoice.subscriptionId,
                subscriptionUserId: invoice.subscription.userId,
                billingDate: invoice.billingDate.toISOString(),
            })),
            failedWebhookEvents: failedWebhookRows.map((event) => ({
                provider: event.provider,
                eventId: event.eventId,
                status: event.status,
                processedAt: event.processedAt.toISOString(),
                sourceRoute: event.sourceRoute,
            })),
        },
        needsAttention,
    }
}
