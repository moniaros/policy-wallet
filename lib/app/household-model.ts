import { db } from "@/lib/db"
import { deriveInsuredNames } from "@/lib/wallet/insured-people"
import { displayPersonName } from "@/lib/wallet/policy-identity"
import { appFlag } from "./flags"
import { personState } from "./household"
import { loadFindingsContext } from "./home-model"
import type { ProtectionState } from "./state"

export interface HouseholdModel {
    lang: "el" | "en"
    enabled: boolean
    people: Array<{ id: string; name: string; relation: string; isDependant: boolean; state: ProtectionState; policyCount: number }>
}

/**
 * /me/household (§8.9): people, each with the three-state verdict. A person's
 * policies are the live ones whose insured names include theirs (read from
 * the documents — never guessed); a dependant with no policy is «για έλεγχο»,
 * never «κενό» (G1 rule).
 */
export async function loadHouseholdModel(userId: string, lang: "el" | "en"): Promise<HouseholdModel> {
    const enabled = await appFlag("app.household")
    if (!enabled) return { lang, enabled, people: [] }
    const [people, ctx] = await Promise.all([
        db.householdPerson.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }).catch(() => []),
        loadFindingsContext(userId, lang),
    ])
    const live = ctx.composed.filter((p) => p.lifecycle !== "expired" && p.lifecycle !== "cancelled")
    const namesByPolicy = new Map(live.map((p) => [p.id, deriveInsuredNames(ctx.rawById.get(p.id)?.acordData).map((n) => n.toLocaleLowerCase("el-GR"))]))
    const stateOf = (policyId: string) => {
        const findings = ctx.findings.filter((f) => f.object.policyId === policyId)
        return findings.some((f) => f.kind === "gap") ? "gap" : findings.some((f) => f.kind === "review") ? "review" : "covered"
    }
    return {
        lang,
        enabled,
        people: people.map((person) => {
            const needle = person.name.toLocaleLowerCase("el-GR")
            const theirPolicies = live.filter((p) => (namesByPolicy.get(p.id) ?? []).some((n) => n.includes(needle) || needle.includes(n)))
            return {
                id: person.id,
                name: displayPersonName(person.name) || person.name,
                relation: person.relation,
                isDependant: person.isDependant,
                state: personState({ id: person.id, relation: (["self", "partner", "child", "parent", "other"] as const).includes(person.relation as never) ? (person.relation as "partner") : "other", isDependant: person.isDependant, policyStates: theirPolicies.map((p) => stateOf(p.id)) }),
                policyCount: theirPolicies.length,
            }
        }),
    }
}
