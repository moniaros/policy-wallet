import { HashDisclosure } from "@/components/ui/HashDisclosure"
import { policyholderFlowCopy } from "@/lib/i18n/policyholder-flow"
import type { ComponentProps } from "react"
import { ChevronDown, Compass } from "lucide-react"

import { LifeEventsPanel, type LifeEventOption, type RecordedEvent } from "@/components/coverage/LifeEventsPanel"
import { RiskProfileWizard } from "@/components/coverage/RiskProfileWizard"

/**
 * «Με βάση τη ζωή σας» — what the person can tell us, in one place: the
 * life-event panel (anchored `#life-events` for the dashboard's prompt card)
 * and, when the engine still has unknown factors, the full profile wizard
 * (anchored `#risk-profile-wizard` for the risk lens's next action). The
 * wizard's heading is a sentence-case title, not the eyebrow it used to be.
 */
export function LifeSection({
    lifeEvents,
    wizard,
    language,
    copy,
}: {
    lifeEvents: { options: LifeEventOption[]; recent: RecordedEvent[] }
    wizard: { show: boolean; initialData: ComponentProps<typeof RiskProfileWizard>["initialData"] }
    language: "el" | "en"
    copy: { title: string; lead: string; fullProfile: { title: string; lead: string } }
}) {
    return (
        <section id="life" aria-labelledby="protection-life-heading" className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4 scroll-mt-20">
            {/* Explicit minmax(0,1fr): an implicit auto track grows to the widest
                item's min-content, and the life-event panel's chip strip took
                this section to 838px on a 768px tablet on the first capture. */}
            <div className="min-w-0">
                <h2 id="protection-life-heading" className="text-body-lg font-semibold leading-snug tracking-tight text-foreground">
                    {copy.title}
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{copy.lead}</p>
            </div>
            <HashDisclosure id="life-events" summary={policyholderFlowCopy(language).lifeChange}>
                <LifeEventsPanel options={lifeEvents.options} recent={lifeEvents.recent} language={language} />
            </HashDisclosure>
            {/* The full profile is a long form. It opens on demand — progressive
                disclosure (Goal 11): the first capture rendered it expanded and
                it was two screens of inputs on every visit. The summary IS the
                card; the wizard's own card follows inside the disclosure, so no
                card sits inside a card. A fragment link to #risk-profile-wizard
                (the risk lens's next action) opens the disclosure in the browser. */}
            {wizard.show && (
                <HashDisclosure id="risk-profile-wizard" summary={copy.fullProfile.title}>
                    <p className="mb-4 text-sm text-muted-foreground">{copy.fullProfile.lead}</p>
                    <RiskProfileWizard initialData={wizard.initialData} language={language} />
                </HashDisclosure>
            )}
        </section>
    )
}
