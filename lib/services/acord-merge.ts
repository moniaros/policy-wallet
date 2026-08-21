/**
 * Merge a later document's extraction over an earlier one.
 *
 * A Greek policy is not one document. The first year issues a
 * πρωτασφαλιστήριο carrying the full terms; every year after that issues an
 * ανανεωτήριο that states the premium, the period, sometimes a sum insured —
 * and is SILENT about everything else. Silence means "unchanged", not "gone".
 *
 * The merge this replaces was a shallow spread:
 *
 *     { ...base.acordData, ...incoming.acordData }
 *
 * which overwrites whole SECTIONS. A renewal whose extraction produced
 * `vehicle: { estimatedMarketValue: 6000 }` — all the notice mentioned —
 * replaced the base `vehicle` object outright, taking make, model, green-card
 * expiry, own-damage and glass-breakage with it. The policy then reported that
 * cover it plainly had was missing, and the gap engine, which reads exactly
 * those fields, would have said so to the customer.
 *
 * Worse, it was inconsistent: a section the renewal never mentioned survived
 * intact, so whether you kept your terms depended on whether the extractor
 * happened to emit the key at all.
 *
 * The rule here is the document's rule. An explicit value in the newer
 * document wins. Absence inherits.
 */

/** Absent = the newer document said nothing. Not the same as saying "none". */
function isSilent(value: unknown): boolean {
    return value === undefined || value === null
}

/** Plain objects merge field by field; arrays and scalars replace wholesale. */
function isPlainObject(value: unknown): value is Record<string, unknown> {
    return (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value) &&
        !(value instanceof Date)
    )
}

export function mergeAcordData(
    base: unknown,
    incoming: unknown
): Record<string, unknown> {
    if (!isPlainObject(base)) return isPlainObject(incoming) ? { ...incoming } : {}
    if (!isPlainObject(incoming)) return { ...base }

    const out: Record<string, unknown> = { ...base }

    for (const [key, incomingValue] of Object.entries(incoming)) {
        // The newer document is silent here — keep what the contract said.
        if (isSilent(incomingValue)) continue

        const baseValue = out[key]

        if (isPlainObject(incomingValue) && isPlainObject(baseValue)) {
            out[key] = mergeAcordData(baseValue, incomingValue)
            continue
        }

        // An explicitly EMPTY array is a statement in this codebase — an empty
        // beneficiary list means nobody is named (see isAbsent in
        // gap-detection.ts). It is allowed to override.
        out[key] = incomingValue
    }

    return out
}
