import { getBillingReconciliationSnapshot, type BillingReconciliationSnapshot } from "@/lib/services/billing/reconciliation.service"
import { getDsrEvidenceSnapshot, type DsrEvidenceSnapshot } from "@/lib/services/compliance/dsr-evidence.service"
import { runSyntheticLaunchChecks, type SyntheticLaunchSnapshot } from "@/lib/services/ops/synthetic-launch-check.service"

type LaunchReadinessLevel = "green" | "amber" | "red"

type LaunchReadinessSignal = {
    code: string
    severity: "blocker" | "warning"
    message: string
}

type LaunchReadinessOptions = {
    windowHours?: number
}

export type LaunchReadinessSnapshot = {
    generatedAt: string
    windowHours: number
    level: LaunchReadinessLevel
    signals: LaunchReadinessSignal[]
    synthetic: SyntheticLaunchSnapshot
    billing: BillingReconciliationSnapshot
    dsr: DsrEvidenceSnapshot
}

function evaluateSignals(args: {
    synthetic: SyntheticLaunchSnapshot
    billing: BillingReconciliationSnapshot
    dsr: DsrEvidenceSnapshot
}): LaunchReadinessSignal[] {
    const signals: LaunchReadinessSignal[] = []

    for (const check of args.synthetic.checks) {
        if (check.status === "fail") {
            signals.push({
                code: `SYNTHETIC_${check.id.toUpperCase()}`,
                severity: "blocker",
                message: `Synthetic check failed: ${check.id}`,
            })
        } else if (check.status === "warn") {
            signals.push({
                code: `SYNTHETIC_${check.id.toUpperCase()}`,
                severity: "warning",
                message: `Synthetic check warning: ${check.id}`,
            })
        }
    }

    if (args.billing.summary.activeStripeMissingExternalId > 0) {
        signals.push({
            code: "BILLING_STRIPE_EXTERNAL_ID_MISSING",
            severity: "blocker",
            message: "Active Stripe subscriptions are missing external IDs.",
        })
    }

    if (args.billing.summary.activeRevenueCatMissingExternalId > 0) {
        signals.push({
            code: "BILLING_REVENUECAT_EXTERNAL_ID_MISSING",
            severity: "blocker",
            message: "Active RevenueCat subscriptions are missing external IDs.",
        })
    }

    if (args.billing.summary.activePaidSubscriptionsWithoutRecentInvoice > 0) {
        signals.push({
            code: "BILLING_MISSING_RECENT_INVOICE",
            severity: "blocker",
            message: "Paid subscriptions without recent invoices were detected.",
        })
    }

    if (args.billing.summary.invoiceUserMismatches > 0) {
        signals.push({
            code: "BILLING_INVOICE_USER_MISMATCH",
            severity: "blocker",
            message: "Invoice/subscription user mismatches were detected.",
        })
    }

    if (args.billing.summary.staleFailedWebhookEvents > 0) {
        signals.push({
            code: "BILLING_STALE_FAILED_WEBHOOKS",
            severity: "blocker",
            message: "Stale failed webhook events are present.",
        })
    }

    if (args.billing.summary.recentWebhookFailed > 0) {
        signals.push({
            code: "BILLING_RECENT_WEBHOOK_FAILURES",
            severity: "warning",
            message: "Recent webhook failures were detected in the selected window.",
        })
    }

    if (args.dsr.summary.pendingBeyondSla > 0) {
        signals.push({
            code: "DSR_PENDING_BEYOND_SLA",
            severity: "blocker",
            message: "DSR requests pending beyond SLA were detected.",
        })
    }

    if (args.dsr.summary.failedInWindow > 0) {
        signals.push({
            code: "DSR_FAILURES_IN_WINDOW",
            severity: "warning",
            message: "DSR requests failed in the selected window.",
        })
    }

    return signals
}

function resolveLevel(signals: LaunchReadinessSignal[]): LaunchReadinessLevel {
    if (signals.some((signal) => signal.severity === "blocker")) return "red"
    if (signals.length > 0) return "amber"
    return "green"
}

export async function getLaunchReadinessSnapshot(
    options: LaunchReadinessOptions = {}
): Promise<LaunchReadinessSnapshot> {
    const windowHours = options.windowHours ?? 24

    const [synthetic, billing, dsr] = await Promise.all([
        runSyntheticLaunchChecks(),
        getBillingReconciliationSnapshot({ windowHours }),
        getDsrEvidenceSnapshot({ windowHours }),
    ])

    const signals = evaluateSignals({ synthetic, billing, dsr })

    return {
        generatedAt: new Date().toISOString(),
        windowHours,
        level: resolveLevel(signals),
        signals,
        synthetic,
        billing,
        dsr,
    }
}
