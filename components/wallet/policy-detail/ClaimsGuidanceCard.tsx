"use client"

import { CalendarClock, LifeBuoy, MessageCircle, Phone } from "lucide-react"
import Link from "next/link"
import { pickLang, type NotableCondition } from "@/lib/wallet/policy-detail"

interface ClaimsGuidanceCardProps {
    lang: "el" | "en"
    insurerName: string
    policyNumber: string | null
    insurerPhone: string
    /** Deadline-type conditions extracted from the policy (claim_deadline / notification_obligation). */
    deadlines: NotableCondition[]
    hasAgent: boolean
    /**
     * Branch-specific claim steps from lib/insurance/content, already resolved
     * to one language by the caller (keeps bilingual literals out of .tsx).
     * Absent/empty → the four generic fallback steps below.
     */
    branchSteps?: string[]
    copy: {
        claimsTitle: string
        claimsSubtitle: string
        claimStep1Title: string
        claimStep1Desc: string
        claimStep2Title: string
        claimStep2Desc: string
        claimStep3Title: string
        claimStep3Desc: string
        claimStep4Title: string
        claimStep4Desc: string
        claimNoDeadlines: string
        claimWhatYouNeedTitle: string
        claimDeadlinesTitle: string
        claimNeedHelp: string
        claimAskAiCta: string
        claimAskAgentCta: string
        /** No-advisor variant — "my agent" is false when hasAgent is false. */
        claimFindAgentCta: string
        claimsDisclaimer: string
        contactInsurer: string
        /** Shown when no claims number was extracted — never a fabricated number. */
        claimsPhoneUnknown: string
        policyNumberLabel: string
    }
    onCallInsurer: () => void
}

/**
 * Step-by-step claims guidance for non-experts.
 *
 * The ordered list is pure editorial text — either the branch-specific steps
 * from lib/insurance/content or the four generic fallbacks. Everything
 * data-backed (the insurer call button, the policy number, and the deadlines
 * the AI extracted from THIS document) lives in the panels below the list, so
 * the guidance works at any step count. Deadlines stay visually distinct from
 * editorial copy because they are real extracted data, not advice.
 */
export function ClaimsGuidanceCard({
    lang,
    insurerName,
    policyNumber,
    insurerPhone,
    deadlines,
    hasAgent,
    branchSteps,
    copy,
    onCallInsurer,
}: ClaimsGuidanceCardProps) {
    const fallbackSteps = [
        { title: copy.claimStep1Title, desc: copy.claimStep1Desc },
        { title: copy.claimStep2Title, desc: copy.claimStep2Desc },
        { title: copy.claimStep3Title, desc: copy.claimStep3Desc },
        { title: copy.claimStep4Title, desc: copy.claimStep4Desc },
    ]
    const steps: { title: string; desc?: string }[] =
        branchSteps && branchSteps.length > 0 ? branchSteps.map((text) => ({ title: text })) : fallbackSteps

    // Always worth showing: if we have no number, saying where to find one is
    // more use than silence on the screen someone opens after a loss.
    const hasWhatYouNeed = true

    return (
        <div>
            <div className="mb-1 flex items-center gap-2">
                <LifeBuoy className="h-4 w-4 text-primary dark:text-mint" />
                <h2 className="text-body font-semibold text-foreground">{copy.claimsTitle}</h2>
            </div>
            <p className="mb-5 text-xs text-muted-foreground">{copy.claimsSubtitle}</p>

            <ol className="space-y-4">
                {steps.map((step, i) => (
                    <li key={i} className="flex items-start gap-3.5">
                        <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-black text-primary-foreground">
                            {i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-black dark:text-white">{step.title}</p>
                            {step.desc && (
                                <p className="mt-0.5 text-xs leading-relaxed text-black/60 dark:text-white/65">{step.desc}</p>
                            )}
                        </div>
                    </li>
                ))}
            </ol>

            {/* What you'll need — data-backed affordances, decoupled from the
                step list so branch bundles of any length still get them. */}
            {hasWhatYouNeed && (
                <div className="mt-5 border-t border-black/10 pt-4 dark:border-white/10">
                    <h3 className="mb-2.5 text-caption font-medium text-muted-foreground">
                        {copy.claimWhatYouNeedTitle}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2">
                        {insurerPhone && (
                            <button
                                onClick={onCallInsurer}
                                className="pw-primary-button text-micro"
                            >
                                <Phone className="h-3 w-3" />
                                {copy.contactInsurer} — {insurerName}
                            </button>
                        )}
                        {!insurerPhone && (
                            <p className="w-full text-caption leading-snug text-black/70 dark:text-white/70">
                                {copy.claimsPhoneUnknown}
                            </p>
                        )}
                        {policyNumber && (
                            <p className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-black/[0.03] px-3 py-1.5 dark:border-white/15 dark:bg-white/5">
                                <span className="text-caption font-medium text-muted-foreground">
                                    {copy.policyNumberLabel}
                                </span>
                                <span className="font-mono text-xs font-bold text-black dark:text-white">{policyNumber}</span>
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Deadlines extracted from THIS policy — amber, never styled like
                the editorial steps above; this is data, not guidance. */}
            <div className="mt-5 border-t border-black/10 pt-4 dark:border-white/10">
                <h3 className="mb-2.5 flex items-center gap-1.5 text-caption font-medium text-muted-foreground">
                    <CalendarClock className="h-3.5 w-3.5 text-status-warning" />
                    {copy.claimDeadlinesTitle}
                </h3>
                {deadlines.length > 0 ? (
                    <ul className="space-y-1.5">
                        {deadlines.map((deadline, j) => (
                            <li
                                key={j}
                                className="flex items-start gap-2 rounded-xl border border-amber-200 bg-status-warning-tint/50 px-3 py-2 dark:border-amber-900/40"
                            >
                                <CalendarClock className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-status-warning" />
                                <p className="text-xs leading-relaxed text-status-warning">
                                    {deadline.value && <span className="font-mono font-bold">{deadline.value} · </span>}
                                    {pickLang(deadline.summary, lang)}
                                </p>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-xs italic text-black/60 dark:text-white/55">{copy.claimNoDeadlines}</p>
                )}
            </div>

            <div className="mt-5 border-t border-black/10 pt-4 dark:border-white/10">
                <p className="mb-2.5 text-xs font-semibold text-black/60 dark:text-white/65">{copy.claimNeedHelp}</p>
                <div className="flex flex-wrap gap-2">
                    <a
                        href="#policy-qa"
                        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-black/15 bg-white px-3.5 py-2 text-xs font-semibold text-black transition-colors hover:bg-black/5 dark:border-white/20 dark:bg-black dark:text-white dark:hover:bg-white/10"
                    >
                        <MessageCircle className="h-3.5 w-3.5 text-primary dark:text-mint" />
                        {copy.claimAskAiCta}
                    </a>
                    <Link
                        href={hasAgent ? "#agent" : "/agent"}
                        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-black/15 bg-white px-3.5 py-2 text-xs font-semibold text-black transition-colors hover:bg-black/5 dark:border-white/20 dark:bg-black dark:text-white dark:hover:bg-white/10"
                    >
                        <MessageCircle className="h-3.5 w-3.5 text-primary dark:text-mint" />
                        {/* "Ask my agent" only if they actually have one; otherwise
                            the possessive is false and this routes to /agent to find one. */}
                        {hasAgent ? copy.claimAskAgentCta : copy.claimFindAgentCta}
                    </Link>
                </div>
                <p className="mt-3 text-micro text-muted-foreground">{copy.claimsDisclaimer}</p>
            </div>
        </div>
    )
}
