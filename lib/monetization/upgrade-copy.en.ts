/**
 * English conversion copy — mirror of upgrade-copy.el.ts (keys parity-tested).
 */

import type { FeatureKey } from "./feature-gates"
import type { UpgradeTriggerCopy } from "./upgrade-copy.el"

const TRUST = "Secure payment with Stripe · Cancel anytime · No hidden fees"

export const UPGRADE_COPY_EN: Record<FeatureKey, UpgradeTriggerCopy> = {
    policy_upload_limit: {
        headline: "Organize your whole portfolio",
        body: "You've reached your free plan's policy limit. Upgrade to organize your entire insurance portfolio in one place.",
        primaryCta: "Upgrade for more policies",
        secondaryCta: "Not now",
        benefits: [
            "Up to 10 policies (Plus) or up to 25 (Family)",
            "Full AI analysis for every policy (Family)",
            "One view across all your insurers",
            "More renewal reminders (Plus)",
        ],
        trust: TRUST,
        successMessage: "Upgrade complete. You can now add all your policies.",
        successCta: "Continue adding",
    },
    full_ai_policy_analysis: {
        headline: "Unlock the full analysis",
        body: "Your basic summary is ready. Unlock the full analysis to see gaps, exclusions, limits and suggested actions.",
        primaryCta: "Unlock full analysis",
        secondaryCta: "Not now",
        benefits: [
            "Detailed view of coverages and limits",
            "Exclusions and fine print in plain language",
            "Detection of possible coverage gaps",
            "Suggested next actions",
        ],
        trust: TRUST,
        successMessage: "Upgrade complete. You unlocked full analysis for your policies.",
        successCta: "Continue to analysis",
    },
    advanced_gap_detection: {
        headline: "See what the coverage gap means",
        body: "We detected a possible coverage gap. Upgrade to see what it means, where it comes from and what you can do.",
        primaryCta: "See the coverage gap",
        secondaryCta: "Not now",
        benefits: [
            "Full explanation of each gap with evidence",
            "Findings to discuss with your insurance adviser",
            "Concrete next steps",
        ],
        trust: TRUST,
        successMessage: "Upgrade complete. All coverage findings are available.",
        successCta: "See the findings",
    },
    unlimited_ai_questions: {
        headline: "Keep asking the AI",
        // See the note in upgrade-copy.el.ts: there is no free allowance and no
        // monthly reset, so "used your free questions for this month" is wrong twice.
        body: "AI questions about your policies are included in the Family plan. Upgrade to ask freely about coverages, limits and exclusions.",
        primaryCta: "Continue with questions",
        secondaryCta: "Not now",
        benefits: [
            "Questions about coverages, limits and exclusions",
            "Answers grounded in your own policy",
            "Available for all your policies",
            "Greek and English",
        ],
        trust: TRUST,
        successMessage: "Upgrade complete. AI questions are available again.",
        successCta: "Continue asking",
    },
    multi_insurer_insights: {
        headline: "See your full portfolio picture",
        body: "You have policies from different insurers. Upgrade to see the complete picture, possible overlaps and gaps.",
        primaryCta: "See full portfolio picture",
        secondaryCta: "Not now",
        benefits: [
            "One view across all your insurers",
            "Spot possible coverage overlaps",
            "See gaps between policies more clearly",
            "Make better use of your insurance",
        ],
        trust: TRUST,
        successMessage: "Upgrade complete. Your full portfolio picture is ready.",
        successCta: "View portfolio",
    },
    agent_collaboration: {
        headline: "Connect with your advisor",
        body: "Share selected information with your insurance advisor, with your approval and the ability to revoke at any time.",
        primaryCta: "Connect with advisor",
        secondaryCta: "Not now",
        benefits: [
            "You share only what you choose",
            "Revoke access at any time",
            "Notes and proposals from your advisor",
            "Document requests without emails",
        ],
        trust: TRUST,
        successMessage: "Upgrade complete. Advisor collaboration is available.",
        successCta: "Connect with advisor",
    },
    export_report: {
        headline: "Unlock report export",
        body: "Download a clean summary of your policies, renewals and key coverages.",
        primaryCta: "Unlock report export",
        secondaryCta: "Not now",
        benefits: [
            "Summary of all policies in one file",
            "Key coverages and renewal dates",
            "Ideal for discussing with your advisor",
            "Always up to date with current data",
        ],
        trust: TRUST,
        successMessage: "Upgrade complete. Report export is available.",
        successCta: "Download report",
    },
    advanced_renewal_reminders: {
        headline: "More renewal reminders",
        body: "On every plan you get one reminder 30 days before expiry. With Plus you get reminders from 90 to 3 days ahead.",
        primaryCta: "See Plus",
        secondaryCta: "Not now",
        benefits: [
            "Reminders at 90, 60, 30, 15, 7 and 3 days before expiry",
            "An email before every expiry",
            "The 30-day reminder stays on every plan",
            "Never miss a renewal again",
        ],
        trust: TRUST,
        successMessage: "Upgrade complete. The full renewal reminders are active.",
        successCta: "Set up reminders",
    },
    pdf_preview: {
        headline: "Document preview",
        body: "View your policy PDFs directly inside the app, no downloads needed.",
        primaryCta: "Unlock preview",
        secondaryCta: "Not now",
        benefits: [
            "Open PDFs inside the app",
            "Quick access to any page",
            "All documents in one secure place",
            "Available on mobile too",
        ],
        trust: TRUST,
        successMessage: "Upgrade complete. PDF preview is available.",
        successCta: "View documents",
    },
    token_topup: {
        headline: "Continue your AI analyses",
        body: "You have reached your plan's monthly analysis limit. The limit renews every month.",
        primaryCta: "See the plans",
        secondaryCta: "Not now",
        benefits: [
            "The limit renews every month",
            "Your policies stay saved",
            "See which plan fits the volume of your documents",
        ],
        trust: TRUST,
        successMessage: "Upgrade complete. You can continue the analysis.",
        successCta: "Continue to analysis",
    },
    partner_offers: {
        headline: "Partner benefits with Family",
        body: "Family includes benefits from selected partners — prevention services and discounts worth more than the subscription itself.",
        primaryCta: "Unlock benefits with Family",
        secondaryCta: "Not now",
        benefits: [
            "Free or discounted prevention services",
            "Offers matched to your profile",
            "New benefits added at no extra cost",
            "Alongside the full Family AI analysis",
        ],
        trust: TRUST,
        successMessage: "Upgrade complete. Partner benefits are available.",
        successCta: "See your benefits",
    },
    // Future-tense capability description on purpose: this card renders BEFORE
    // any monitoring has run for the viewer, so it must never claim a check
    // already happened or promise a cadence the jobs do not keep.
    protection_monitoring: {
        headline: "A standing watch over your protection",
        body: "Family keeps watching between your visits — after every change and on regular checks — and tells you when something deserves a look.",
        primaryCta: "Turn on the protection monitor",
        secondaryCta: "Not now",
        benefits: [
            "Flags cover that is about to lapse",
            "Shows when your protection moves backwards",
            "Keeps serious exposures visible until they are handled",
            "Tells you how current your picture is",
        ],
        trust: TRUST,
        successMessage: "Upgrade complete. The protection monitor is on.",
        successCta: "See your monitor",
    },
}
