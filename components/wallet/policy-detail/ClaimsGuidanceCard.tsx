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
        claimNeedHelp: string
        claimAskAiCta: string
        claimAskAgentCta: string
        claimsDisclaimer: string
        contactInsurer: string
        policyNumberLabel: string
    }
    onCallInsurer: () => void
}

/**
 * Step-by-step claims guidance for non-experts. Data-aware: surfaces the
 * claim deadlines the AI extracted from this specific policy and wires the
 * insurer's phone number into the "call your insurer" step.
 */
export function ClaimsGuidanceCard({
    lang,
    insurerName,
    policyNumber,
    insurerPhone,
    deadlines,
    hasAgent,
    copy,
    onCallInsurer,
}: ClaimsGuidanceCardProps) {
    const steps = [
        { title: copy.claimStep1Title, desc: copy.claimStep1Desc },
        { title: copy.claimStep2Title, desc: copy.claimStep2Desc },
        { title: copy.claimStep3Title, desc: copy.claimStep3Desc },
        { title: copy.claimStep4Title, desc: copy.claimStep4Desc },
    ]

    return (
        <div className="pw-card p-6 sm:p-7">
            <div className="mb-1 flex items-center gap-2">
                <LifeBuoy className="h-4 w-4 text-primary dark:text-mint" />
                <h2 className="text-sm font-black uppercase tracking-widest text-black/60 dark:text-white/70">{copy.claimsTitle}</h2>
            </div>
            <p className="mb-5 text-xs text-black/55 dark:text-white/60">{copy.claimsSubtitle}</p>

            <ol className="space-y-4">
                {steps.map((step, i) => (
                    <li key={i} className="flex items-start gap-3.5">
                        <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-black text-white dark:text-[#1A2420]">
                            {i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-black dark:text-white">{step.title}</p>
                            <p className="mt-0.5 text-xs leading-relaxed text-black/60 dark:text-white/65">{step.desc}</p>

                            {/* Step 2 — call the insurer */}
                            {i === 1 && insurerPhone && (
                                <button
                                    onClick={onCallInsurer}
                                    className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-primary-hover dark:text-[#1A2420] cursor-pointer"
                                >
                                    <Phone className="h-3 w-3" />
                                    {copy.contactInsurer} — {insurerName}
                                </button>
                            )}

                            {/* Step 3 — the details they'll be asked for */}
                            {i === 2 && policyNumber && (
                                <p className="mt-2 inline-flex items-center gap-2 rounded-xl border border-black/10 bg-black/[0.03] px-3 py-1.5 dark:border-white/15 dark:bg-white/5">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-black/50 dark:text-white/55">
                                        {copy.policyNumberLabel}
                                    </span>
                                    <span className="font-mono text-xs font-bold text-black dark:text-white">{policyNumber}</span>
                                </p>
                            )}

                            {/* Step 4 — deadlines extracted from this policy */}
                            {i === 3 &&
                                (deadlines.length > 0 ? (
                                    <ul className="mt-2 space-y-1.5">
                                        {deadlines.map((deadline, j) => (
                                            <li
                                                key={j}
                                                className="flex items-start gap-2 rounded-xl border border-amber-200 bg-[#FEF3C7]/50 px-3 py-2 dark:border-amber-900/40 dark:bg-amber-950/15"
                                            >
                                                <CalendarClock className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[#B45309] dark:text-amber-400" />
                                                <p className="text-xs leading-relaxed text-[#B45309] dark:text-amber-300">
                                                    {deadline.value && (
                                                        <span className="font-mono font-bold">{deadline.value} · </span>
                                                    )}
                                                    {pickLang(deadline.summary, lang)}
                                                </p>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="mt-2 text-xs italic text-black/50 dark:text-white/55">{copy.claimNoDeadlines}</p>
                                ))}
                        </div>
                    </li>
                ))}
            </ol>

            <div className="mt-5 border-t border-black/10 pt-4 dark:border-white/10">
                <p className="mb-2.5 text-xs font-semibold text-black/60 dark:text-white/65">{copy.claimNeedHelp}</p>
                <div className="flex flex-wrap gap-2">
                    <a
                        href="#policy-qa"
                        className="inline-flex items-center gap-1.5 rounded-full border border-black/15 bg-white px-3.5 py-2 text-xs font-semibold text-black transition-colors hover:bg-black/5 dark:border-white/20 dark:bg-black dark:text-white dark:hover:bg-white/10"
                    >
                        <MessageCircle className="h-3.5 w-3.5 text-primary dark:text-mint" />
                        {copy.claimAskAiCta}
                    </a>
                    <Link
                        href={hasAgent ? "#agent" : "/agent"}
                        className="inline-flex items-center gap-1.5 rounded-full border border-black/15 bg-white px-3.5 py-2 text-xs font-semibold text-black transition-colors hover:bg-black/5 dark:border-white/20 dark:bg-black dark:text-white dark:hover:bg-white/10"
                    >
                        <MessageCircle className="h-3.5 w-3.5 text-primary dark:text-mint" />
                        {copy.claimAskAgentCta}
                    </Link>
                </div>
                <p className="mt-3 text-[11px] text-black/45 dark:text-white/50">{copy.claimsDisclaimer}</p>
            </div>
        </div>
    )
}
