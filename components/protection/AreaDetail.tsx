import Link from "next/link"
import { ArrowLeft, ClipboardList, FileText, MessageCircleQuestion, ShieldCheck } from "lucide-react"

import { CardHead } from "@/components/dashboard/home/CardHead"
import { IMPORTANCE_TONE } from "@/components/onboarding/protection-profile/ProtectionMapCard"
import { ActionLink } from "@/components/protection/ActionLink"
import { AreaOpenedBeacon } from "@/components/protection/AssessmentBeacons"
import { AreaQuestionFlow, type AnswerInput, type AnswerResult, type QuestionFlowCopy } from "@/components/protection/AreaQuestionFlow"
import type { AreaDetailModel, AreaRiskView, MitigationView, PreventionFromPolicyView } from "@/components/protection/area-detail-model"
import type { getTranslations } from "@/lib/i18n"
import { AREAS } from "@/lib/protection/domains"
import { protectionDomainIcon } from "@/lib/services/protection-profile/domain-icons"
import { cn } from "@/lib/utils"
import { TONE_PILL } from "@/lib/wallet/policy-status-view"

type AttentionCopy = ReturnType<typeof getTranslations>["protection"]["attention"]

export interface AreaDetailProps {
    model: AreaDetailModel
    copy: AttentionCopy
    flowCopy: QuestionFlowCopy
    onAnswer: (input: AnswerInput) => Promise<AnswerResult>
}

const sectionTitle = "text-caption font-semibold uppercase tracking-wide text-muted-foreground"

/** One part of the explanation triplet, honouring the density the person chose (§F). */
function Explanation({ heading, body, density, always }: { heading: string; body: string; density: AreaDetailModel["explanation"]["density"]; always?: boolean }) {
    if (always || density === "expanded") {
        return (
            <div>
                <h2 className={sectionTitle}>{heading}</h2>
                <p className="mt-1 text-sm leading-relaxed text-foreground [overflow-wrap:anywhere]">{body}</p>
            </div>
        )
    }
    return (
        <details className={cn(density === "minimal" && "text-muted-foreground")}>
            <summary className={cn("cursor-pointer select-none", sectionTitle)}>{heading}</summary>
            <p className="mt-1 text-sm leading-relaxed text-foreground [overflow-wrap:anywhere]">{body}</p>
        </details>
    )
}

function RiskRow({ risk, copy, density, open }: { risk: AreaRiskView; copy: AttentionCopy; density: AreaDetailModel["explanation"]["density"]; open: boolean }) {
    const body = (
        <div className="mt-2 space-y-2 text-caption leading-relaxed text-foreground/80">
            <p className="[overflow-wrap:anywhere]">
                <span className="sr-only">{copy.detail.riskExplain}: </span>
                {risk.explanation}
            </p>
            {risk.applicable ? (
                <>
                    <p className="[overflow-wrap:anywhere]">
                        <span className="font-semibold text-foreground">{copy.detail.riskWhy}: </span>
                        {risk.why}
                    </p>
                    <p className="[overflow-wrap:anywhere]">
                        <span className="font-semibold text-foreground">{copy.detail.riskImpact}: </span>
                        {risk.impact}
                    </p>
                </>
            ) : (
                <p className="[overflow-wrap:anywhere]">{risk.why}</p>
            )}
            {risk.eligibilityNote ? (
                <p className="[overflow-wrap:anywhere]">
                    <span className="font-semibold text-foreground">{copy.detail.riskEligibility}: </span>
                    {risk.eligibilityNote}
                </p>
            ) : null}
        </div>
    )
    const head = (
        <span className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <span className="text-sm font-semibold text-foreground [overflow-wrap:anywhere]">{risk.name}</span>
            <span className="text-caption text-muted-foreground" data-risk-status={risk.status}>
                {risk.statusWord}
            </span>
        </span>
    )
    if (density === "expanded") {
        return (
            <li className="pw-subcard p-3" data-risk={risk.id}>
                {head}
                {body}
            </li>
        )
    }
    return (
        <li className="pw-subcard p-3" data-risk={risk.id}>
            <details open={open || undefined}>
                <summary className="cursor-pointer select-none">{head}</summary>
                {body}
            </details>
        </li>
    )
}

function MitigationRow({ item }: { item: MitigationView }) {
    return (
        <li className="pw-subcard p-3" data-mitigation={item.kind}>
            <p className="text-sm font-semibold text-foreground [overflow-wrap:anywhere]">{item.label}</p>
            <p className="mt-1 text-caption leading-relaxed text-foreground/80 [overflow-wrap:anywhere]">{item.detail}</p>
            <p className="mt-1 text-caption text-muted-foreground [overflow-wrap:anywhere]">{item.riskName}</p>
        </li>
    )
}

function PreventionFromPolicyRow({ item, copy, area }: { item: PreventionFromPolicyView; copy: AttentionCopy; area: string }) {
    return (
        <li className="pw-subcard p-3" data-prevention-source="policy">
            <p className="text-caption text-muted-foreground">
                {copy.detail.preventionFromPolicy} · {item.policyLabel}
                {item.recurring ? ` · ${copy.detail.preventionRecurring}` : null}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-foreground [overflow-wrap:anywhere]">{item.text}</p>
            <ActionLink href={item.href} kind="prevention" area={area} className="pw-soft-button mt-2 bg-background shadow-sm !text-caption">
                {copy.detail.openPolicy}
            </ActionLink>
        </li>
    )
}

/**
 * The area detail — /protection/areas/[area] (docs/planning/
 * PERSONAL_RISK_PROFILE.md §D): why this is showing · what we do not know
 * yet · what happens next; the area's risks in the engine's own words; the
 * questions, one at a time; what the policies we have seen say (and only
 * that); and what can be done, prevention first. Mobile-first, one primary
 * button (the current question's continue), everything else soft.
 */
export function AreaDetail({ model, copy, flowCopy, onAnswer }: AreaDetailProps) {
    const Icon = protectionDomainIcon(AREAS[model.area].priorityId)
    const density = model.explanation.density
    const hasMitigations =
        model.mitigations.prevention.length + model.mitigations.retain.length + model.mitigations.transfer.length + model.preventionFromPolicies.length > 0
    const caveat = model.findings.find((f) => f.caveat)?.caveat ?? null

    return (
        <div className="pw-page-shell">
            <div className="mx-auto max-w-3xl space-y-4 px-4 pb-10 pt-6 sm:px-6 lg:px-8 lg:pt-8">
                <AreaOpenedBeacon area={model.area} importance={model.importance} alignment={model.alignment} confidence={model.confidence} />

                <nav aria-label={copy.detail.back}>
                    <Link href="/protection?lens=risk" className="pw-soft-button !px-3.5 !text-caption">
                        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                        {copy.detail.back}
                    </Link>
                </nav>

                {/* The verdict words and the triplet. */}
                <header className="pw-card pw-pad" data-area={model.area} data-alignment={model.alignment}>
                    <p className="pw-kicker">{copy.detail.kicker}</p>
                    <CardHead
                        icon={Icon}
                        title={model.label}
                        as="h1"
                        id="area-heading"
                        className="mt-2"
                        meta={
                            <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-caption font-semibold", IMPORTANCE_TONE[model.importance])}>
                                {model.importanceWord}
                            </span>
                        }
                    />
                    <p className="mt-3 text-body font-semibold leading-snug text-foreground [overflow-wrap:anywhere]">{model.alignmentWord}</p>
                    <p className="mt-1 text-caption leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">{model.confidenceWord}</p>
                    <div className="mt-4 space-y-3 border-t border-border pt-4">
                        <Explanation heading={copy.headings.why} body={model.explanation.why} density={density} />
                        <Explanation heading={copy.headings.unknown} body={model.explanation.unknown} density={density} always />
                        <Explanation heading={copy.headings.next} body={model.explanation.next} density={density} />
                    </div>
                </header>

                {/* The risks, in the catalogue's own words. */}
                {model.risks.length > 0 ? (
                    <section className="pw-card pw-pad" aria-labelledby="area-risks-heading">
                        <CardHead icon={ShieldCheck} title={copy.detail.risksTitle} id="area-risks-heading" />
                        <ul className="mt-4 space-y-2">
                            {model.risks.map((risk) => (
                                <RiskRow key={risk.id} risk={risk} copy={copy} density={density} open={model.explainFirst} />
                            ))}
                        </ul>
                    </section>
                ) : null}

                {/* «Βοηθήστε μας να καταλάβουμε» — one question at a time. */}
                <section className="pw-card pw-pad" aria-labelledby="area-questions-heading">
                    <CardHead icon={MessageCircleQuestion} title={copy.detail.questionsTitle} id="area-questions-heading" />
                    {model.questions.length > 0 ? <p className="mt-2 text-caption leading-relaxed text-muted-foreground">{copy.detail.questionsLead}</p> : null}
                    <AreaQuestionFlow
                        area={model.area}
                        questions={model.questions}
                        unknownFactorCount={model.unknownFactorCount}
                        copy={flowCopy}
                        onAnswer={onAnswer}
                        headingId="area-questions-heading"
                    />
                </section>

                {/* «Τι λένε τα ασφαλιστήριά σας» — only what we have seen. */}
                <section className="pw-card pw-pad" aria-labelledby="area-policies-heading">
                    <CardHead icon={FileText} title={copy.detail.policiesTitle} id="area-policies-heading" />
                    <p className="mt-2 text-caption leading-relaxed text-muted-foreground">{copy.detail.policiesLead}</p>

                    {model.lines.length > 0 ? (
                        <ul className="mt-3 space-y-2">
                            {model.lines.map((line) => (
                                <li key={line.policyId} className="pw-subcard p-3" data-policy={line.policyId} data-detail={line.detail}>
                                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                                        <p className="text-sm font-semibold text-foreground [overflow-wrap:anywhere]">{line.label}</p>
                                        <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-caption font-semibold", TONE_PILL[line.statusTone])}>
                                            {line.statusWord}
                                        </span>
                                    </div>
                                    <p className="mt-0.5 text-caption text-muted-foreground [overflow-wrap:anywhere]">
                                        {line.lineLabel} · {line.limitsWord}
                                    </p>
                                    <Link href={line.href} className="pw-soft-button mt-2 bg-background shadow-sm !text-caption">
                                        {copy.detail.openPolicy}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    ) : null}

                    {model.limitsUnread && model.deepAnalysisLocked ? (
                        <div className="pw-subcard mt-3 p-3">
                            <p className="text-caption leading-relaxed text-foreground/80">{copy.detail.upgradeHint}</p>
                            <Link href="/upgrade?reason=feature_locked" className="pw-soft-button mt-2 bg-background shadow-sm !text-caption">
                                {copy.detail.upgradeCta}
                            </Link>
                        </div>
                    ) : null}

                    {model.findings.length > 0 ? (
                        <div className="mt-4 border-t border-border pt-3">
                            <h3 className={sectionTitle}>{copy.detail.findingsTitle}</h3>
                            <ul className="mt-2 space-y-2">
                                {model.findings.map((finding) => (
                                    <li key={finding.id} className="pw-subcard p-3" data-finding={finding.id}>
                                        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                                            <p className="text-sm font-semibold text-foreground [overflow-wrap:anywhere]">{finding.title}</p>
                                            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-caption font-semibold text-foreground" data-severity={finding.severity}>
                                                {finding.severityLabel}
                                            </span>
                                        </div>
                                        <p className="mt-0.5 text-caption text-muted-foreground [overflow-wrap:anywhere]">{finding.policyLabel}</p>
                                        <ActionLink href={finding.href} kind="review_finding" area={model.area} className="pw-soft-button mt-2 bg-background shadow-sm !text-caption">
                                            {copy.detail.openPolicy}
                                        </ActionLink>
                                    </li>
                                ))}
                            </ul>
                            {caveat ? <p className="mt-2 text-caption leading-relaxed text-muted-foreground">{caveat}</p> : null}
                        </div>
                    ) : null}

                    {!model.anyHeld ? (
                        <div className="mt-3">
                            <p className="text-sm leading-relaxed text-foreground">
                                {copy.detail.noPolicies} {copy.caveats.absence_not_evidence}
                            </p>
                            <ActionLink href="/wallet/add" kind="check_first_policy" area={model.area} className="pw-soft-button mt-3">
                                {copy.detail.addPolicy}
                            </ActionLink>
                        </div>
                    ) : null}
                </section>

                {/* «Τι μπορείτε να κάνετε» — prevention first, insurance one option among others. */}
                <section className="pw-card pw-pad" aria-labelledby="area-actions-heading">
                    <CardHead icon={ClipboardList} title={copy.detail.actionsTitle} id="area-actions-heading" />
                    {!hasMitigations ? (
                        <p className="mt-3 text-sm leading-relaxed text-foreground">{copy.detail.actionsNone}</p>
                    ) : (
                        <>
                            <p className="mt-2 text-caption leading-relaxed text-muted-foreground">{copy.detail.actionsLead}</p>

                            {model.mitigations.prevention.length + model.preventionFromPolicies.length > 0 ? (
                                <div className="mt-4" data-mitigation-group="prevention">
                                    <h3 className={sectionTitle}>{copy.detail.prevention}</h3>
                                    <p className="mt-1 text-caption leading-relaxed text-muted-foreground">{copy.detail.preventionLead}</p>
                                    <ul className="mt-2 space-y-2">
                                        {model.mitigations.prevention.map((item) => (
                                            <MitigationRow key={`${item.riskId}:${item.label}`} item={item} />
                                        ))}
                                        {model.preventionFromPolicies.map((item) => (
                                            <PreventionFromPolicyRow key={item.id} item={item} copy={copy} area={model.area} />
                                        ))}
                                    </ul>
                                </div>
                            ) : null}

                            {model.mitigations.retain.length > 0 ? (
                                <div className="mt-4" data-mitigation-group="retain">
                                    <h3 className={sectionTitle}>{copy.detail.retain}</h3>
                                    <ul className="mt-2 space-y-2">
                                        {model.mitigations.retain.map((item) => (
                                            <MitigationRow key={`${item.riskId}:${item.label}`} item={item} />
                                        ))}
                                    </ul>
                                </div>
                            ) : null}

                            {model.mitigations.transfer.length > 0 ? (
                                <div className="mt-4" data-mitigation-group="transfer">
                                    <h3 className={sectionTitle}>{copy.detail.transfer}</h3>
                                    <p className="mt-1 text-caption leading-relaxed text-muted-foreground">{copy.detail.transferLead}</p>
                                    <ul className="mt-2 space-y-2">
                                        {model.mitigations.transfer.map((item) => (
                                            <MitigationRow key={`${item.riskId}:${item.label}`} item={item} />
                                        ))}
                                    </ul>
                                    <ActionLink href="/agent" kind="contact_advisor" area={model.area} className="pw-soft-button mt-3">
                                        {copy.detail.discuss}
                                    </ActionLink>
                                </div>
                            ) : null}
                        </>
                    )}
                </section>
            </div>
        </div>
    )
}
