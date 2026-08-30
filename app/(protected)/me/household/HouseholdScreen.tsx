"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useLanguage } from "@/contexts/LanguageContext"
import { formatPlural } from "@/lib/i18n/plural"
import { trackJourneyEvent } from "@/lib/journey/funnel"
import type { HouseholdModel } from "@/lib/app/household-model"
import { AppSection, GroupedList, Row } from "@/src/design-system/app-layout"
import { Button, Input, StatusChip } from "@/src/design-system/primitives"
import { Switch } from "@/src/design-system/switch"
import { addHouseholdPerson } from "./actions"

const RELATIONS = ["partner", "child", "parent", "other"] as const

/**
 * /me/household (§8.9): who is at home, each with the three-state verdict —
 * a dependant with no policy is «για έλεγχο», never «κενό». Adding a person
 * is the one-minute task; matching to policies reads the documents' insured
 * names, it never guesses.
 */
export function HouseholdScreen({ model }: { model: HouseholdModel }) {
    const { t, language: lang } = useLanguage()
    const router = useRouter()
    const [pending, start] = useTransition()
    const [name, setName] = useState("")
    const [relation, setRelation] = useState<(typeof RELATIONS)[number]>("partner")
    const [isDependant, setIsDependant] = useState(true)
    const stateLabels = { covered: t.app.state.covered, gap: t.app.state.gap, review: t.app.state.review }
    const me = t.app.me.household

    if (!model.enabled) {
        return (
            <AppSection id="household">
                <p className="text-g-app-body text-fg-secondary">{me.unavailable}</p>
            </AppSection>
        )
    }

    return (
        <>
            <AppSection id="household">
                <p className="mb-g-3 text-g-app-body-sm text-fg-secondary">{me.intro}</p>
                {model.people.length === 0 ? (
                    <p className="text-g-app-body text-fg-secondary">{me.empty}</p>
                ) : (
                    <GroupedList label={t.settings.nav.household.label}>
                        {model.people.map((p) => (
                            <Row
                                key={p.id}
                                href={`/me/household/${p.id}`}
                                primary={p.name}
                                secondary={[me.relations[p.relation as keyof typeof me.relations] ?? p.relation, p.isDependant ? me.dependant : null, formatPlural(t.app.household.policies, { count: p.policyCount }, lang)].filter(Boolean).join(" · ")}
                                trailing={<StatusChip state={p.state}>{stateLabels[p.state]}</StatusChip>}
                            />
                        ))}
                    </GroupedList>
                )}
            </AppSection>

            <AppSection id="add" title={me.addTitle}>
                <form
                    className="flex max-w-md flex-col gap-g-3"
                    onSubmit={(e) => {
                        e.preventDefault()
                        start(async () => {
                            const r = await addHouseholdPerson({ name, relation, isDependant })
                            if (r.ok) {
                                trackJourneyEvent("household.person_added", { relation, is_dependant: isDependant })
                                toast.success(me.added)
                                setName("")
                                router.refresh()
                            } else toast.error(me.addFailed)
                        })
                    }}
                >
                    <label>
                        <span className="mb-g-1 block text-g-app-body-sm font-medium text-fg-secondary">{me.name}</span>
                        <Input required value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
                    </label>
                    <div role="radiogroup" aria-label={me.relation} className="flex flex-wrap gap-g-2">
                        {RELATIONS.map((r) => (
                            <button key={r} type="button" role="radio" aria-checked={relation === r} onClick={() => setRelation(r)} className="inline-flex min-h-11 items-center rounded-g-control border border-border-subtle px-g-3 text-g-app-body-sm font-medium text-fg-primary aria-checked:border-border-strong aria-checked:bg-surface-sunken">
                                {me.relations[r]}
                            </button>
                        ))}
                    </div>
                    <Switch checked={isDependant} onCheckedChange={setIsDependant} label={me.dependantQuestion} description={me.dependantHint} />
                    <Button type="submit" variant="primary" loading={pending} className="self-start">{me.add}</Button>
                </form>
            </AppSection>
        </>
    )
}
