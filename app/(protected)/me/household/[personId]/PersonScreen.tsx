"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useLanguage } from "@/contexts/LanguageContext"
import { AppSection } from "@/src/design-system/app-layout"
import { Button, Input } from "@/src/design-system/primitives"
import { Switch } from "@/src/design-system/switch"
import { removeHouseholdPerson, updateHouseholdPerson } from "../actions"

const RELATIONS = ["partner", "child", "parent", "other"] as const

export function PersonScreen({ person }: { person: { id: string; name: string; relation: string; isDependant: boolean } }) {
    const { t } = useLanguage()
    const router = useRouter()
    const [pending, start] = useTransition()
    const [name, setName] = useState(person.name)
    const [relation, setRelation] = useState<(typeof RELATIONS)[number]>((RELATIONS as readonly string[]).includes(person.relation) ? (person.relation as (typeof RELATIONS)[number]) : "other")
    const [isDependant, setIsDependant] = useState(person.isDependant)
    const me = t.app.me.household

    return (
        <AppSection id="person" title={person.name}>
            <form
                className="flex max-w-md flex-col gap-g-3"
                onSubmit={(e) => {
                    e.preventDefault()
                    start(async () => {
                        const r = await updateHouseholdPerson({ id: person.id, name, relation, isDependant })
                        if (r.ok) { toast.success(me.saved); router.push("/me/household") } else toast.error(me.addFailed)
                    })
                }}
            >
                <label>
                    <span className="mb-g-1 block text-g-app-body-sm font-medium text-fg-secondary">{me.name}</span>
                    <Input required value={name} onChange={(e) => setName(e.target.value)} />
                </label>
                <div role="radiogroup" aria-label={me.relation} className="flex flex-wrap gap-g-2">
                    {RELATIONS.map((r) => (
                        <button key={r} type="button" role="radio" aria-checked={relation === r} onClick={() => setRelation(r)} className="inline-flex min-h-11 items-center rounded-g-control border border-border-subtle px-g-3 text-g-app-body-sm font-medium text-fg-primary aria-checked:border-border-strong aria-checked:bg-surface-sunken">
                            {me.relations[r]}
                        </button>
                    ))}
                </div>
                <Switch checked={isDependant} onCheckedChange={setIsDependant} label={me.dependantQuestion} description={me.dependantHint} />
                <div className="flex gap-g-2">
                    <Button type="submit" variant="primary" loading={pending}>{me.save}</Button>
                    <Button
                        type="button"
                        variant="danger"
                        disabled={pending}
                        onClick={() => {
                            if (!window.confirm(me.removeConfirm)) return
                            start(async () => {
                                const r = await removeHouseholdPerson({ id: person.id })
                                if (r.ok) { toast.success(me.removed); router.push("/me/household") } else toast.error(me.addFailed)
                            })
                        }}
                    >
                        {me.remove}
                    </Button>
                </div>
            </form>
        </AppSection>
    )
}
