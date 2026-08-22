"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowUpRight, CheckCircle2, ListChecks, Lock, MessageSquarePlus, Phone, Plus, Sparkles } from "lucide-react"

import type { BranchActionType } from "@/lib/insurance/content/types"
import { usePolicyQaPrefill } from "@/components/wallet/policy-detail/PolicyQaPrefillContext"

/**
 * Per-branch recommended actions, data-backed where possible.
 *
 * Two shapes per action:
 *  - ANSWERED — the answer is already in `acordData`, so we show it as a data
 *    chip (plus a `tel:` link when a hotline came with it). Resolution happens
 *    in lib/insurance/content/action-resolvers.ts, which asserts positives
 *    only; this component never infers anything itself.
 *  - ASK — everything else, rendered as a CTA (ask the AI, jump to a section,
 *    upload, renewals, profile, or hand off to the advisor).
 *
 * Purely presentational: every string arrives already resolved to one language
 * by the caller, so lint:i18n-changed stays clean.
 */
export interface BranchActionItem {
    id: string
    label: string
    ctaType: BranchActionType
    href: string | null
    /** askAi actions only — the question to prefill in PolicyQA. */
    question?: string
    /** From resolveBranchAction(); `value` is already localised. */
    resolved: { status: "answered" | "ask"; value?: string; phone?: string }
}

interface BranchActionsCardProps {
    actions: BranchActionItem[]
    /** Where `profile` CTAs point. */
    profileHref: string
    /** Where `upload` CTAs point. */
    uploadHref: string
    /** Invoked by `renewals` CTAs — reuses the page's renewal-quote flow. */
    onRequestQuote?: () => void
    isRequestingQuote?: boolean
    /** `askAgent` CTAs — opens (or reuses) the advisor thread for this action. */
    onAskAgent?: (item: BranchActionItem) => void
    /** `task` CTAs — creates the self-assigned reminder for this action. */
    onCreateTask?: (item: BranchActionItem) => void
    /**
     * Free tier: agent-bound CTAs render with a lock chip and route the click
     * to the upgrade modal instead of the flow. They are NOT hidden — a
     * removed button converts nobody.
     */
    agentActionsLocked?: boolean
    /** Action id currently mid-flight, so the row can show a pending state. */
    pendingActionId?: string | null
    copy: {
        actionsTitle: string
        actionsAnsweredHeading: string
        actionsTodoHeading: string
        actionsCall: string
        actionsShowAll: string
        actionsShowLess: string
        actionsLocked: string
        actionsWorking: string
    }
}

/** Answered chips shown before the "show all" toggle kicks in. */
const ANSWERED_PREVIEW_COUNT = 4

function AnsweredChip({ item, callLabel }: { item: BranchActionItem; callLabel: string }) {
    return (
        <li className="rounded-xl border border-primary/20 bg-primary/[0.06] px-3 py-2.5 dark:border-mint/20 dark:bg-mint/10">
            <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary dark:text-mint" aria-hidden />
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-black dark:text-white">{item.label}</p>
                    {item.resolved.value && (
                        <p className="mt-0.5 text-xs leading-relaxed text-black/65 dark:text-white/70">
                            {item.resolved.value}
                        </p>
                    )}
                    {item.resolved.phone && (
                        <a
                            href={`tel:${item.resolved.phone.replace(/\s+/g, "")}`}
                            className="min-h-[44px] mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-[color:var(--pw-border-control)] bg-white/70 px-2.5 py-1 text-micro font-bold text-primary hover:bg-white dark:bg-mint/10 dark:text-mint"
                        >
                            <Phone className="h-3 w-3" aria-hidden />
                            <span>{callLabel}</span>
                            <span className="font-mono">{item.resolved.phone}</span>
                        </a>
                    )}
                </div>
            </div>
        </li>
    )
}

const CTA_CLASS =
    "flex w-full items-center justify-between gap-3 rounded-xl border border-[color:var(--pw-border-control)] bg-black/[0.03] px-3 py-2.5 text-left text-xs font-semibold text-black/75 transition-colors hover:bg-black/[0.06] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white/5 dark:text-white/75 dark:hover:bg-white/10"

export function BranchActionsCard({
    actions,
    profileHref,
    uploadHref,
    onRequestQuote,
    isRequestingQuote,
    onAskAgent,
    onCreateTask,
    agentActionsLocked,
    pendingActionId,
    copy,
}: BranchActionsCardProps) {
    const { ask } = usePolicyQaPrefill()
    const [showAllAnswered, setShowAllAnswered] = useState(false)

    const answered = actions.filter((item) => item.resolved.status === "answered")
    const todo = actions.filter((item) => item.resolved.status !== "answered")

    if (answered.length === 0 && todo.length === 0) return null

    const visibleAnswered = showAllAnswered ? answered : answered.slice(0, ANSWERED_PREVIEW_COUNT)
    const hiddenAnsweredCount = answered.length - visibleAnswered.length

    function renderCta(item: BranchActionItem) {
        const isPending = pendingActionId === item.id
        const icon =
            item.ctaType === "askAi" ? (
                <Sparkles className="h-3.5 w-3.5 flex-shrink-0 text-primary dark:text-mint" aria-hidden />
            ) : item.ctaType === "askAgent" ? (
                <MessageSquarePlus className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" aria-hidden />
            ) : item.ctaType === "task" ? (
                <Plus className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" aria-hidden />
            ) : (
                <ArrowUpRight className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" aria-hidden />
            )

        // askAgent — open (or reuse) the advisor thread. On the free tier the
        // button stays, wearing a lock chip; the handler routes to the upgrade
        // modal. Hiding it would delete the only place a free user learns the
        // feature exists.
        if (item.ctaType === "askAgent" && onAskAgent) {
            return (
                <button
                    type="button"
                    onClick={() => onAskAgent(item)}
                    disabled={isPending}
                    className={`${CTA_CLASS} cursor-pointer`}
                >
                    <span className="min-w-0">{isPending ? copy.actionsWorking : item.label}</span>
                    {agentActionsLocked ? (
                        <span className="inline-flex flex-shrink-0 items-center gap-1 rounded-full border border-black/10 bg-black/[0.04] px-2 py-0.5 text-kicker font-black uppercase tracking-wider text-black/55 dark:border-white/15 dark:bg-white/10 dark:text-white/60">
                            <Lock className="h-2.5 w-2.5" aria-hidden />
                            {copy.actionsLocked}
                        </span>
                    ) : (
                        icon
                    )}
                </button>
            )
        }

        // task — a self-assigned reminder. Nothing paid is involved (no agent,
        // no AI), so this is never gated.
        if (item.ctaType === "task" && onCreateTask) {
            return (
                <button
                    type="button"
                    onClick={() => onCreateTask(item)}
                    disabled={isPending}
                    className={`${CTA_CLASS} cursor-pointer`}
                >
                    <span className="min-w-0">{isPending ? copy.actionsWorking : item.label}</span>
                    {icon}
                </button>
            )
        }

        // askAi — imperative prefill so repeat clicks on the same page refire.
        // Deliberately NOT gated here: PolicyQA enforces its own free-question
        // limit and renders its own UPGRADE_REQUIRED state, so double-gating
        // would block users who still have free questions left.
        if (item.ctaType === "askAi" && item.question) {
            const question = item.question
            return (
                <button type="button" onClick={() => ask(question)} className={`${CTA_CLASS} cursor-pointer`}>
                    <span className="min-w-0">{item.label}</span>
                    {icon}
                </button>
            )
        }

        // renewals — reuse the page's existing renewal-quote request.
        if (item.ctaType === "renewals" && onRequestQuote) {
            return (
                <button
                    type="button"
                    onClick={onRequestQuote}
                    disabled={isRequestingQuote}
                    className={`${CTA_CLASS} cursor-pointer`}
                >
                    <span className="min-w-0">{item.label}</span>
                    {icon}
                </button>
            )
        }

        // review — in-page anchor; upload / profile — fixed routes.
        // A `task` action reaching here has no handler wired; it has no href
        // either, so it correctly renders nothing rather than a dead link.
        const href =
            item.ctaType === "review"
                ? "#coverage"
                : item.ctaType === "upload"
                  ? uploadHref
                  : item.ctaType === "profile"
                    ? (item.href ?? profileHref)
                    : item.href

        if (!href) return null

        return (
            <Link href={href} className={CTA_CLASS}>
                <span className="min-w-0">{item.label}</span>
                {icon}
            </Link>
        )
    }

    return (
        <div className="pw-card pw-pad sm:p-7">
            <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-black/60 dark:text-white/70">
                <ListChecks className="h-4 w-4 text-primary dark:text-mint" aria-hidden />
                {copy.actionsTitle}
            </h2>

            {answered.length > 0 && (
                <div className="mt-5">
                    <h3 className="mb-2 text-kicker font-black uppercase tracking-widest text-black/60 dark:text-white/55">
                        {copy.actionsAnsweredHeading}
                    </h3>
                    <ul className="space-y-2">
                        {visibleAnswered.map((item) => (
                            <AnsweredChip key={item.id} item={item} callLabel={copy.actionsCall} />
                        ))}
                    </ul>
                    {answered.length > ANSWERED_PREVIEW_COUNT && (
                        <button
                            type="button"
                            onClick={() => setShowAllAnswered((prev) => !prev)}
                            className="mt-2 cursor-pointer text-micro font-bold text-primary underline-offset-2 hover:underline dark:text-mint"
                        >
                            {hiddenAnsweredCount > 0 ? copy.actionsShowAll : copy.actionsShowLess}
                        </button>
                    )}
                </div>
            )}

            {todo.length > 0 && (
                <div className="mt-5">
                    <h3 className="mb-2 text-kicker font-black uppercase tracking-widest text-black/60 dark:text-white/55">
                        {copy.actionsTodoHeading}
                    </h3>
                    <ul className="space-y-2">
                        {todo.map((item) => {
                            const cta = renderCta(item)
                            return cta ? <li key={item.id}>{cta}</li> : null
                        })}
                    </ul>
                </div>
            )}
        </div>
    )
}
