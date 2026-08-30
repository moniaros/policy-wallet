"use client"

import Link from "next/link"
import { useState } from "react"
import { useLanguage } from "@/contexts/LanguageContext"
import { formatPlural } from "@/lib/i18n/plural"
import { formatCurrency } from "@/lib/i18n/format"
import { resolveSentence, resolveSource } from "@/lib/app/render-copy"
import { PRIMARY_NAV, SECONDARY_NAV } from "@/lib/app/navigation"
import type { PolicyDetailModel } from "@/lib/app/policy-detail-model"
import { LargeTitleNav } from "@/src/design-system/shell"
import { AppSection, GroupedList, Row } from "@/src/design-system/app-layout"
import { Button, StatusChip, buttonClassName } from "@/src/design-system/primitives"
import { CoverageChecklist, QuestionList, ActionRow, ActionRowList, PlatformNote } from "@/src/design-system/app"
import { PolicyQA } from "@/components/wallet/PolicyQA"
import { DocumentsCard } from "@/components/wallet/policy-detail/DocumentsCard"
import { AddDocumentCard } from "@/components/wallet/policy-detail/AddDocumentCard"
import { DeletePolicyDialog } from "@/components/wallet/DeletePolicy"
import { GlossaryHint } from "@/components/insurance/GlossaryHint"
import { resolveCoverageAbsenceCopy } from "@/lib/wallet/policy-detail"

/**
 * /policies/[id] (§8.4). Sections: hero · checklist · findings · questions ·
 * qa · documents · manage · note — eight, the measured ceiling, with two AI
 * entry points (the plain-language lede and «Ρωτάτε με απλά λόγια»). Every
 * checklist line cites its document or says «δεν αναφέρεται».
 */
export function PolicyDetailScreen({ model }: { model: PolicyDetailModel }) {
    const { t, language: lang } = useLanguage()
    const [deleting, setDeleting] = useState(false)
    const brand = { href: PRIMARY_NAV[0].href, label: t.app.nav.brand }
    const back = { href: PRIMARY_NAV[2].href, label: t.app.policy.back }
    const adviserHref = SECONDARY_NAV.find((e) => e.id === "adviser")?.href ?? "/adviser"
    const helpHref = model.findings[0] ? `${adviserHref}/help/${encodeURIComponent(model.findings[0].hash)}` : adviserHref
    const editHref = `/wallet/${model.id}/edit`
    const stateLabels = { covered: t.app.state.covered, gap: t.app.state.gap, review: t.app.state.review }
    const detailsCopy = t.wallet.policyDetailsPage

    const gaps = model.findings.filter((f) => f.kind === "gap").length
    const reviews = model.findings.filter((f) => f.kind === "review").length
    const verdict = gaps > 0 ? formatPlural(t.app.policy.verdictGap, { count: gaps }, lang) : reviews > 0 ? formatPlural(t.app.policy.verdictReview, { count: reviews }, lang) : model.checklist.length > 0 ? t.app.policy.verdictOk : t.app.policy.checklistEmpty
    // No verdict without saying why there is none (all-clear-honesty): the latest run's state, with its blocked reason, decides the sentence.
    const absence = resolveCoverageAbsenceCopy(model.latestRunStatus, model.blockedReason, detailsCopy)
    const lede = model.summary.state === "ok" && model.summary.text ? model.summary.text : model.summary.state === "language_mismatch" ? t.app.policy.summaryMismatch : `${absence.title}. ${absence.hint}`
    const expiring = model.lifecycle === "expiring_soon" && typeof model.daysUntilExpiry === "number"

    const facts: Array<{ key: string; label: string; value: string; fact: string }> = [
        { key: "ends", label: t.app.policy.facts.ends, value: model.endDate ?? "—", fact: "policy.endDate" },
        ...(typeof model.daysUntilExpiry === "number" && model.lifecycle !== "expired" ? [{ key: "days", label: t.app.policy.facts.remaining, value: formatPlural(t.app.policies.daysLeft, { count: model.daysUntilExpiry }, lang), fact: "policy.daysRemaining" }] : []),
        ...(model.premium ? [{ key: "premium", label: t.app.policy.facts.premium, value: formatCurrency(model.premium.amount, lang, { currency: model.premium.currency }), fact: "policy.premium" }] : []),
        ...(model.insured ? [{ key: "insured", label: t.app.policy.facts.insured, value: model.insured, fact: "policy.insured" }] : []),
        ...(model.number ? [{ key: "number", label: t.app.policy.facts.number, value: model.number, fact: "policy.number" }] : []),
    ]

    const citation = (c: PolicyDetailModel["checklist"][number]) =>
        c.citation.page && c.citation.document
            ? formatPlural(t.app.policy.sourcePage, { document: c.citation.document, page: c.citation.page }, lang)
            : c.citation.document && c.state !== "review"
              ? formatPlural(t.app.policy.source, { document: c.citation.document }, lang)
              : c.state === "review" ? t.app.policy.notFound : t.app.policy.notStated

    const questionText = (q: PolicyDetailModel["questions"][number]) => formatPlural(t.app.policy.q[q.kind], q.params, lang)

    return (
        <>
            <LargeTitleNav title={model.asset ? `${model.lineLabel} · ${model.asset}` : model.lineLabel} back={back} brand={brand} subtitle={model.insurer ? formatPlural(t.app.policy.kindLine, { line: model.lineLabel, insurer: model.insurer }, lang) : model.label} />

            <AppSection id="hero">
                <div className="rounded-g-hero border border-border-hair bg-surface-raised p-g-5 shadow-g-raised">
                    {model.state && <StatusChip state={model.state}>{stateLabels[model.state]}</StatusChip>}
                    <h2 className="mt-g-3 font-display text-g-title text-fg-primary">{verdict}</h2>
                    <p className="mt-g-2 text-g-app-body text-fg-secondary" data-fact="policy.summary">{lede}</p>
                    <dl className="mt-g-4 grid grid-cols-2 gap-g-3 tablet:grid-cols-4">
                        {facts.map((f) => (
                            <div key={f.key}>
                                <dt className="text-g-app-caption text-fg-secondary">{f.label}</dt>
                                <dd className="text-g-app-body font-semibold tabular-nums text-fg-primary" data-fact={f.fact}>{f.value}</dd>
                            </div>
                        ))}
                    </dl>
                    {expiring && <p className="mt-g-3 text-g-app-body-sm text-fg-secondary">{formatPlural(t.app.policy.expiring, { count: model.daysUntilExpiry! }, lang)}</p>}
                    {!model.canReviewExtraction && (model.reviewState === "unconfirmed" || model.reviewState === "flagged") && (
                        <p className="mt-g-3 text-g-app-body-sm text-fg-secondary" data-fact="policy.unverifiedNote">{t.wallet.review.ownerUnverifiedNote}</p>
                    )}
                    {model.canReviewExtraction && (model.reviewState === "unconfirmed" || model.reviewState === "flagged") && (
                        <Link href={`/wallet/${model.id}/review`} className={buttonClassName({ variant: "secondary", size: "sm" }, "mt-g-3")}>{t.app.policy.reviewExtraction}</Link>
                    )}
                    <div className="mt-g-4 flex flex-wrap gap-g-2">
                        {expiring && model.isOwner ? (
                            <a href="#documents" className={buttonClassName({ variant: "primary", size: "md" })}>{t.app.policy.paid}</a>
                        ) : (
                            <a href="#qa" className={buttonClassName({ variant: "primary", size: "md" })}>{t.app.policy.ask}</a>
                        )}
                        <Link href={helpHref} className={buttonClassName({ variant: "secondary", size: "md" })}>{t.app.policy.help}</Link>
                    </div>
                </div>
            </AppSection>

            <AppSection id="checklist" title={t.app.policy.checklist}>
                {model.checklist.length === 0 ? (
                    <p className="text-g-app-body text-fg-secondary">{t.app.policy.checklistEmpty}</p>
                ) : (
                    <>
                        <CoverageChecklist lines={model.checklist.map((c) => ({ id: c.id, label: c.label, state: c.state, citation: citation(c) }))} stateLabels={{ ok: t.app.checklist.ok, not: t.app.checklist.not, review: t.app.checklist.review }} />
                        {model.exclusionHint && model.checklist.some((c) => c.state === "not") && (
                            <p className="mt-g-3 text-g-app-body-sm text-fg-secondary">
                                {t.app.policy.exclusionLead} <GlossaryHint hint={model.exclusionHint} />
                            </p>
                        )}
                    </>
                )}
            </AppSection>

            <AppSection id="findings" title={t.app.policy.findings}>
                {model.findings.length === 0 ? (
                    <p className="text-g-app-body text-fg-secondary">{t.app.policy.findingsEmpty}</p>
                ) : (
                    <ActionRowList label={t.app.policy.findings}>
                        {model.findings.map((f) => (
                            <ActionRow key={f.id} kind={f.kind} sentence={resolveSentence(f, lang, t)} source={resolveSource(f, lang, t)} trailing={typeof f.daysUntilExpiry === "number" ? formatPlural(t.app.finding.daysUntil, { count: f.daysUntilExpiry }, lang) : undefined} href={`${PRIMARY_NAV[1].href}?state=${f.kind}`} />
                        ))}
                    </ActionRowList>
                )}
            </AppSection>

            {model.questions.length > 0 && (
                <AppSection id="questions" title={t.app.policy.questions}>
                    <p className="mb-g-3 text-g-app-body-sm text-fg-secondary">{t.app.policy.questionsHint}</p>
                    <QuestionList questions={model.questions.map((q) => ({ id: q.id, text: questionText(q), href: "#qa" }))} label={t.app.policy.questions} askLabel={t.app.policy.ask} />
                </AppSection>
            )}

            <AppSection id="qa" title={t.app.policy.qa}>
                <PolicyQA policyId={model.id} tier={model.tier} lineOfBusiness={model.lineOfBusiness} freeQuestionsRemaining={model.freeQuestionsRemaining} />
            </AppSection>

            <AppSection id="documents" title={t.app.policy.documents}>
                <DocumentsCard
                    policyId={model.id}
                    documents={model.documents}
                    locale={lang}
                    isFreeTier={model.tier === "free"}
                    copy={{
                        documentsArea: detailsCopy.documentsArea,
                        noDocuments: t.wallet.noDocuments,
                        documentKindLabels: t.wallet.documentKindLabels,
                        documentFormatPdf: t.wallet.documentFormatPdf,
                        documentFormatImage: t.wallet.documentFormatImage,
                        documentFormatOther: t.wallet.documentFormatOther,
                        preview: t.wallet.preview,
                        upgradeToPlusPreview: t.wallet.upgradeToPlusPreview,
                        previewLabels: t.wallet.documentPreview,
                    }}
                />
                {model.isOwner && (
                    <AddDocumentCard
                        policyId={model.id}
                        lifecycleStatus={model.lifecycle}
                        t={t}
                        copy={{
                            title: detailsCopy.addDocumentTitle,
                            note: detailsCopy.addDocumentNote,
                            kindLabel: detailsCopy.addDocumentKindLabel,
                            kindLabels: t.wallet.documentKindLabels,
                            dropTitle: detailsCopy.addDocumentDropTitle,
                            dropHint: detailsCopy.addDocumentDropHint,
                            uploading: detailsCopy.addDocumentUploading,
                            stored: detailsCopy.addDocumentStored,
                            failed: detailsCopy.addDocumentFailed,
                            limitReached: detailsCopy.addDocumentLimitReached,
                            renewalTitle: detailsCopy.renewalUploadTitle,
                            renewalNote: detailsCopy.renewalUploadNote,
                            renewalDropTitle: detailsCopy.renewalUploadDropTitle,
                            renewalUploading: detailsCopy.renewalUploading,
                            renewalUploaded: detailsCopy.renewalUploaded,
                            renewalFailed: detailsCopy.renewalUploadFailed,
                        }}
                    />
                )}
            </AppSection>

            {model.canWrite && (
                <AppSection id="manage" title={t.app.policy.manage}>
                    <GroupedList label={t.app.policy.manage}>
                        <Row href={editHref} primary={t.app.policy.edit} />
                        {model.isOwner && <Row onClick={() => setDeleting(true)} primary={t.app.policy.delete} secondary={t.app.policy.deleteNote} />}
                    </GroupedList>
                    {model.isOwner && <DeletePolicyDialog policyId={model.id} open={deleting} onOpenChange={setDeleting} />}
                </AppSection>
            )}

            <AppSection id="note">
                <PlatformNote title={t.app.note.title} body={t.app.note.body} />
            </AppSection>
        </>
    )
}
