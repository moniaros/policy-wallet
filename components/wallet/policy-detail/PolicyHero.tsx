"use client"

import { Calendar, Download, FileText, MessageCircle, Phone, Share2, Shield, Sparkles, TrendingUp } from "lucide-react"

import { formatPolicyDate, type PremiumFrequency } from "@/lib/wallet/policy-detail"
import { extractedField } from "@/lib/wallet/unreadable-value"

interface PolicyHeroProps {
    displayInsurer: string
    localizedType: string
    displayPolicyNumber: string | null
    plateNumber: string | null
    startDate: string | null
    endDate: string | null
    premiumAmount: number
    premiumCurrency: string
    premiumFrequency: PremiumFrequency | null
    statusLabel: string
    statusColor: { bg: string; text: string; border: string }
    daysLeft: number | null
    /** Renders the amber expired banner under the status chips. */
    expiredNotice?: string | null
    isAnalyzing: boolean
    isPendingInsurer: boolean
    locale: string
    /** Where the source document opens — the only place an unreadable value exists. */
    documentHref?: string | null
    copy: {
        expiresIn: string
        days: string
        policyId: string
        plateNumber: string
        /** Shown in place of a value the extractor could not read. */
        valueUnreadable: string
        valueUnreadableCta: string
        starts: string
        ends: string
        annualPremium: string
        premiumLabel: string
        premiumFrequencies: Record<string, string>
        analyzing: string
        analyzingDocument: string
        analyzingHint: string
        askAi: string
        sharePolicy: string
        downloadContract: string
        contactInsurer: string
    }
    onShare: () => void
    onDownload: () => void
    onCallInsurer: () => void
    /** Overflow (kebab) menu rendered top-right — e.g. delete policy. */
    headerMenu?: React.ReactNode
}

/**
 * A field the extraction could not read, stated as such.
 *
 * The customer's alternative is the document itself, so the affordance to open
 * it is part of the state rather than something to hunt for elsewhere on the
 * page. Never styled like a value.
 */
function UnreadableValue({
    copy,
    documentHref,
}: {
    copy: { valueUnreadable: string; valueUnreadableCta: string }
    documentHref: string | null
}) {
    return (
        <>
            <p className="text-sm font-semibold italic text-white/55">{copy.valueUnreadable}</p>
            {documentHref && (
                <a
                    href={documentHref}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1.5 inline-flex min-h-[44px] items-center gap-1.5 text-xs font-bold text-mint underline underline-offset-2 hover:text-mint/80"
                >
                    <FileText className="h-3.5 w-3.5" aria-hidden />
                    {copy.valueUnreadableCta}
                </a>
            )}
        </>
    )
}

/**
 * Dark hero header: status chips, insurer identity, key metadata tiles,
 * premium card (frequency-aware) and the primary action row.
 */
export function PolicyHero({
    displayInsurer,
    localizedType,
    displayPolicyNumber,
    plateNumber,
    startDate,
    endDate,
    premiumAmount,
    premiumCurrency,
    premiumFrequency,
    statusLabel,
    statusColor,
    daysLeft,
    expiredNotice,
    isAnalyzing,
    isPendingInsurer,
    locale,
    documentHref = null,
    copy,
    onShare,
    onDownload,
    onCallInsurer,
    headerMenu,
}: PolicyHeroProps) {
    // A value the extractor wrote as a placeholder («XXXX») is NOT redacted —
    // PolicyWallet redacts nothing. Saying so, and offering the document, is
    // the difference between "we are hiding this" and "we could not read it".
    const policyNumberField = extractedField(displayPolicyNumber)
    const plateField = extractedField(plateNumber)

    return (
        <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[#111111] p-6 text-white shadow-2xl sm:p-8 lg:p-10">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(137,217,178,0.22),_transparent_45%)]" />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),transparent_40%)]" />

            <div className="relative space-y-7">
                <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-kicker font-black uppercase tracking-widest ${statusColor.bg} ${statusColor.text} ${statusColor.border}`}>
                        {statusLabel}
                    </span>
                    {daysLeft !== null && daysLeft >= 0 && daysLeft <= 30 && (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/60 bg-amber-100/10 px-3 py-1 text-kicker font-black uppercase tracking-widest text-amber-200">
                            <Calendar className="h-3.5 w-3.5" />
                            {copy.expiresIn} {daysLeft} {copy.days}
                        </span>
                    )}
                    {headerMenu && <div className="ml-auto">{headerMenu}</div>}
                </div>

                {expiredNotice && (
                    <div className="flex items-start gap-2.5 rounded-2xl border border-amber-300/50 bg-amber-100/10 px-4 py-3">
                        <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                        <p className="text-sm font-semibold text-amber-100">{expiredNotice}</p>
                    </div>
                )}

                <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0">
                        <div className="mb-4 flex items-start gap-4">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-mint/35 bg-mint/15">
                                <Shield className="h-7 w-7 text-mint" />
                            </div>
                            <div className="min-w-0">
                                <h1 className="text-3xl font-black leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
                                    {displayInsurer}
                                </h1>
                                {isAnalyzing && isPendingInsurer ? (
                                    <p className="mt-2 text-sm font-bold uppercase tracking-[0.2em] text-mint animate-pulse">
                                        {copy.analyzing}...
                                    </p>
                                ) : (
                                    <p className="mt-2 text-sm font-bold uppercase tracking-[0.2em] text-mint">
                                        {localizedType}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* -inverse, NOT .pw-secondary-button. The plain class sets
                        color: var(--pw-text-primary-light) and only flips via
                        `.dark .pw-secondary-button` — but this hero is #111111 in
                        BOTH themes, so in light mode it rendered dark text on a
                        near-black surface and the three actions were invisible. */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            {(policyNumberField.readable ? displayPolicyNumber : true) && (
                                <div className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3" data-fact="policy.policyNumber">
                                    <p className="mb-1 text-kicker font-black uppercase tracking-widest text-white/65">{copy.policyId}</p>
                                    {policyNumberField.readable ? (
                                        <p className="font-mono text-sm font-bold text-white">{displayPolicyNumber}</p>
                                    ) : (
                                        <UnreadableValue copy={copy} documentHref={documentHref} />
                                    )}
                                </div>
                            )}

                            {plateNumber ? (
                                <div className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3" data-fact="vehicle.plateNumber">
                                    <p className="mb-1 text-kicker font-black uppercase tracking-widest text-white/65">{copy.plateNumber}</p>
                                    {plateField.readable ? (
                                        <p className="font-mono text-sm font-bold text-white">{plateField.value}</p>
                                    ) : (
                                        <UnreadableValue copy={copy} documentHref={documentHref} />
                                    )}
                                </div>
                            ) : null}

                            {!isAnalyzing && (
                                <>
                                    <div className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3" data-fact="policy.startDate">
                                        <p className="mb-1 text-kicker font-black uppercase tracking-widest text-white/65">{copy.starts}</p>
                                        <p className="text-sm font-bold text-white">{formatPolicyDate(startDate, locale)}</p>
                                    </div>

                                    <div className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3" data-fact="policy.expiryDate">
                                        <p className="mb-1 text-kicker font-black uppercase tracking-widest text-white/65">{copy.ends}</p>
                                        <p className="text-sm font-bold text-white">{formatPolicyDate(endDate, locale)}</p>
                                    </div>
                                </>
                            )}

                            {isAnalyzing && isPendingInsurer && (
                                <div className="rounded-2xl border border-mint/25 bg-mint/10 px-4 py-3 sm:col-span-2">
                                    <div className="flex items-center gap-2">
                                        <Sparkles className="h-4 w-4 text-mint animate-pulse" />
                                        <p className="text-sm font-bold text-mint">{copy.analyzingDocument}...</p>
                                    </div>
                                    <p className="mt-1 text-xs text-white/55">{copy.analyzingHint}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* `bg-white/5`, NOT `bg-[#111111]`. This card carried the
                        hero's own background colour, separated from it only by a
                        15%-alpha border — so on a phone, where it stacks between
                        the metadata tiles and the action row, it read as a large
                        black void rather than as the premium. The sibling tiles
                        above already use the lifted surface; this one now matches
                        them, which is also what makes it legible as a card. */}
                    {premiumAmount > 0 && (
                        <div className="w-full max-w-xs rounded-3xl border border-white/15 bg-white/5 p-5 shadow-lg" data-fact="policy.premiumAmount">
                            <p className="mb-2 flex items-center gap-2 text-kicker font-black uppercase tracking-widest text-white/65">
                                <TrendingUp className="h-3.5 w-3.5 text-mint" />
                                {premiumFrequency && premiumFrequency !== "annual"
                                    ? `${copy.premiumLabel} · ${copy.premiumFrequencies[premiumFrequency]}`
                                    : copy.annualPremium}
                            </p>
                            <p className="text-4xl font-black leading-none text-white">
                                {premiumAmount.toLocaleString(locale, {
                                    style: "currency",
                                    currency: premiumCurrency,
                                })}
                            </p>
                        </div>
                    )}
                </div>

                {!isAnalyzing && (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <a
                            href="#policy-qa"
                            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-mint px-5 text-sm font-bold text-[#1A2420] transition-colors hover:bg-mint/85"
                        >
                            <MessageCircle className="h-4 w-4" />
                            {copy.askAi}
                        </a>

                        <button
                            onClick={onShare}
                            className="pw-secondary-button-inverse min-h-12 bg-white/5"
                        >
                            <Share2 className="h-4 w-4" />
                            {copy.sharePolicy}
                        </button>

                        <button
                            onClick={onDownload}
                            className="pw-secondary-button-inverse min-h-12 bg-white/5"
                        >
                            <Download className="h-4 w-4" />
                            {copy.downloadContract}
                        </button>

                        <button
                            onClick={onCallInsurer}
                            className="pw-secondary-button-inverse min-h-12 bg-white/5"
                        >
                            <Phone className="h-4 w-4" />
                            {copy.contactInsurer}
                        </button>
                    </div>
                )}
            </div>
        </section>
    )
}
