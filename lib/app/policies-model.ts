import { policyLabel, policyAssetIdentifier, displayInsurerName, displayPolicyNumber, displayPersonName } from "@/lib/wallet/policy-identity"
import { deriveInsuredNames } from "@/lib/wallet/insured-people"
import { formatPolicyDate } from "@/lib/wallet/policy-detail"
import { policyState } from "./state"
import { lineOf, LINES, type LineId } from "./lines"
import { loadFindingsContext } from "./home-model"
import type { ProtectionState } from "./state"

export interface PolicyRow {
    id: string
    href: string
    /** policyLabel() — insurer (number), sentinels scrubbed. */
    label: string
    /** The plate / address / pet name when the document states one; never a sentinel. */
    asset: string | null
    insurer: string | null
    number: string | null
    line: LineId | null
    lineLabel: string
    /** Up to two cover names from the schedule, or null when never read. */
    covers: string[] | null
    premium: { amount: number; currency: string } | null
    person: string | null
    /** null when the policy is not live (expired / cancelled / still being read). */
    state: ProtectionState | null
    lifecycle: "active" | "expiring" | "expired" | "other"
    daysUntilExpiry: number | null
    endDate: string | null
    /** Documents attached — «2 έγγραφα» when a renewal or a duplicate joined the row. */
    documentCount: number
    mergedFrom: string[]
}

export interface PoliciesModel {
    lang: "el" | "en"
    rows: PolicyRow[]
    expired: PolicyRow[]
    lineLabels: Record<string, string>
}

const KEY_COVERS = 2

function coverNames(acord: unknown): string[] | null {
    const list = (acord as { coverages?: Array<{ name?: string; status?: string }> } | null)?.coverages
    if (!Array.isArray(list) || list.length === 0) return null
    return list
        .filter((c) => c && typeof c.name === "string" && c.name.trim() && c.status !== "excluded" && c.status !== "optional_not_taken")
        .slice(0, KEY_COVERS)
        .map((c) => c.name!.trim())
}

/**
 * «Ο φάκελός σας» (§8.3): one row per policy, the asset on the row, three
 * states, expired collapsed. Two policies that share a policy number are the
 * same contract seen through two documents — one row, «2 έγγραφα».
 */
export async function loadPoliciesModel(userId: string, lang: "el" | "en", now: Date = new Date()): Promise<PoliciesModel> {
    const ctx = await loadFindingsContext(userId, lang, now)
    const lineLabels = Object.fromEntries(LINES.map((l) => [l.id, l.label[lang]]))

    const rows: PolicyRow[] = ctx.composed.map((p) => {
        const raw = ctx.rawById.get(p.id)!
        const line = lineOf(p.lineOfBusiness)
        const findings = ctx.findings.filter((f) => f.object.policyId === p.id)
        const state = policyState({ lifecycle: p.lifecycle, daysUntilExpiry: p.daysUntilExpiry, findings: findings.map((f) => ({ kind: f.kind })), unresolvedFields: p.unresolvedFields })
        const status = p.lifecycle
        const lifecycle: PolicyRow["lifecycle"] = status === "expired" ? "expired" : status === "expiring_soon" ? "expiring" : status === "active" || status === "action_needed" ? "active" : "other"
        const row = ctx.policyRows.get(p.id)
        const premiumRaw = row?.premiumAmount as unknown
        const premium = premiumRaw != null && Number.isFinite(Number(premiumRaw)) && Number(premiumRaw) > 0 ? { amount: Number(premiumRaw), currency: row?.premiumCurrency ?? "EUR" } : null
        const people = deriveInsuredNames(raw.acordData)
        return {
            id: p.id,
            href: `/policies/${p.id}`,
            label: policyLabel(raw, ""),
            asset: policyAssetIdentifier({ lineOfBusiness: p.lineOfBusiness, acordData: raw.acordData }),
            insurer: displayInsurerName(raw.insurerName) || null,
            number: displayPolicyNumber(raw.policyNumber),
            line,
            lineLabel: line ? lineLabels[line] : lineLabels.business,
            covers: coverNames(raw.acordData),
            premium,
            person: displayPersonName(people[0], null) || null,
            state,
            lifecycle,
            daysUntilExpiry: typeof p.daysUntilExpiry === "number" ? p.daysUntilExpiry : null,
            endDate: p.endDate ? formatPolicyDate(p.endDate, lang === "el" ? "el-GR" : "en-GB") : null,
            documentCount: raw.documents.length,
            mergedFrom: [],
        }
    })

    // Same policy number ⇒ same contract: merge into the row with the latest end date.
    const merged = new Map<string, PolicyRow>()
    const orphans: PolicyRow[] = []
    for (const r of rows) {
        if (!r.number) { orphans.push(r); continue }
        const key = `${r.insurer ?? ""}::${r.number}`
        const existing = merged.get(key)
        if (!existing) { merged.set(key, r); continue }
        const keep = (existing.daysUntilExpiry ?? -Infinity) >= (r.daysUntilExpiry ?? -Infinity) ? existing : r
        const drop = keep === existing ? r : existing
        keep.documentCount += drop.documentCount
        keep.mergedFrom = [...keep.mergedFrom, drop.id, ...drop.mergedFrom]
        if (drop.state === "gap" || (drop.state === "review" && keep.state === "covered")) keep.state = drop.state
        merged.set(key, keep)
    }
    const all = [...merged.values(), ...orphans]
    const live = all.filter((r) => r.lifecycle !== "expired")
    const expired = all.filter((r) => r.lifecycle === "expired")
    return { lang, rows: live, expired, lineLabels }
}
