import { createHash } from "node:crypto"

/**
 * The catalogue version a run was evaluated against.
 *
 * `npm run verify:gap-catalogue` has fingerprinted the ACTIVE definition set
 * since Aug 2026 to detect drift between the authored catalogue and a
 * database. The same fingerprint is now stamped on every gap row and every
 * run (`gap_instances.catalogue_version`, `policy_analysis_runs.attempted_rules`)
 * so a finding produced under an older catalogue is distinguishable from one
 * produced under the current one — Goal 0 F3 established that the authored
 * set will change, and B2's denominator is derived at this version.
 *
 * Stable across environments: no ids, no timestamps, keys sorted. This is the
 * one implementation; the verify script imports it.
 */
export interface FingerprintableGapDefinition {
    slug: string
    lineOfBusiness: string
    severity: string
    defaultSeverity: string
    ruleId: string
    detectionLogic: unknown
}

export function stableJson(value: unknown): string {
    if (value === null || typeof value !== "object") return JSON.stringify(value ?? null)
    if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b))
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableJson(v)}`).join(",")}}`
}

export function fingerprintGapDefinitions(rows: ReadonlyArray<FingerprintableGapDefinition>): string {
    const canonical = rows
        .map((r) =>
            [r.slug, r.lineOfBusiness, r.severity, r.defaultSeverity, r.ruleId, stableJson(r.detectionLogic)].join("|")
        )
        .sort()
        .join("\n")
    return createHash("sha256").update(canonical).digest("hex").slice(0, 16)
}
