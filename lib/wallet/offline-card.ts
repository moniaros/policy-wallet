import { normalizeBranch } from "@/lib/insurance/taxonomy"
import { displayInsurerName } from "@/lib/wallet/policy-identity"
import { extractedField } from "@/lib/wallet/unreadable-value"

/**
 * Spec v2 §18.1 «offline / cached access»: the numbers someone needs at the
 * roadside without a connection — every phone the policy's own reading states,
 * labelled by what it is for. Pure over the wallet rows, so the service worker
 * can cache the JSON and the /offline page can render it with no server.
 */
export type OfflinePhoneKind = "accident" | "roadside" | "coordination" | "technical" | "emergency" | "insurer"
export interface OfflinePhone { kind: OfflinePhoneKind; number: string }
export interface OfflineCardRow {
    id: string
    insurer: string | null
    branch: { el: string; en: string }
    endDate: string | null
    phones: OfflinePhone[]
}

export function offlineCardRows(
    policies: Array<{ id: string; insurerName: string; lineOfBusiness: string; endDate: Date | null; acordData: unknown }>,
    /** The insurer's VERIFIED call centre — used only when the document states no number. */
    callCentreFor: (insurerName: string) => { phone: string } | null = () => null
): OfflineCardRow[] {
    const rows: OfflineCardRow[] = []
    for (const p of policies) {
        const a = (p.acordData ?? {}) as Record<string, any>
        const candidates: Array<[OfflinePhoneKind, unknown]> = [
            ["accident", a.vehicle?.accidentDeclarationPhone ?? a.motor?.accidentDeclarationPhone],
            ["roadside", a.vehicle?.roadsideAssistancePhone ?? a.motor?.roadsideAssistancePhone],
            ["coordination", a.health?.coordinationCentre?.phone],
            ["technical", a.property?.technicalAssistancePhone ?? a.home?.technicalAssistancePhone],
            ["emergency", a.travel?.emergencyAssistancePhone],
        ]
        const phones: OfflinePhone[] = []
        for (const [kind, raw] of candidates) {
            const value = extractedField(typeof raw === "string" ? raw : null).value
            if (value) phones.push({ kind, number: value })
        }
        if (phones.length === 0) {
            const fallback = callCentreFor(p.insurerName)
            if (fallback) phones.push({ kind: "insurer", number: fallback.phone })
        }
        if (phones.length === 0) continue
        const branch = normalizeBranch(p.lineOfBusiness)
        rows.push({
            id: p.id,
            insurer: displayInsurerName(p.insurerName),
            branch: { el: branch.label.el, en: branch.label.en },
            endDate: p.endDate ? p.endDate.toISOString().slice(0, 10) : null,
            phones,
        })
    }
    return rows
}
