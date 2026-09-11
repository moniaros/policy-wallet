/**
 * The `acordData` paths the authored rules READ — derived from the catalogue,
 * never typed by hand. PW-PROVENANCE-01 W1-01.
 *
 * `decideGapsForPolicy` evaluates each definition's `detectionLogic` against
 * the extracted document: `field` / `fields[]` for a field check, plus the
 * `referenceField` a `value_drift` compares against (the same walk
 * `ruleInputsFor` in lib/gap-detection.ts records beside a finding). Every
 * figure a finding quotes and every boolean a rule fires on lives at one of
 * these paths, so these are the fields whose extraction needs a citation
 * (`extraction-citations.ts`) and, later, a verified one (W1-02) and an
 * evidence state (W2-01).
 *
 * Dependency-free on purpose: the citations module is read while a provider
 * builds its prompt, and lib/gap-detection.ts imports the database client.
 */

import { AUTHORED_GAP_DEFINITIONS } from "./authored-catalogue"

/** The engine's defaults for a `low_limit` rule that names no field (lib/gap-detection.ts). */
const LOW_LIMIT_DEFAULT_FIELDS = ["coverage.sumInsured", "property.insuredValue", "home.insuredValue"]

/** The paths one definition's logic reads, in the order the engine reads them. */
export function fieldsReadByDetectionLogic(logic: unknown): string[] {
    const l = logic as { rules?: unknown } | null
    const rules: unknown[] = Array.isArray(l?.rules) ? (l!.rules as unknown[]) : [logic]
    const out: string[] = []
    for (const raw of rules) {
        if (!raw || typeof raw !== "object") continue
        const rule = raw as Record<string, unknown>
        const fields: string[] = Array.isArray(rule.fields)
            ? (rule.fields as unknown[]).filter((f): f is string => typeof f === "string")
            : typeof rule.field === "string"
              ? [rule.field]
              : rule.type === "low_limit"
                ? LOW_LIMIT_DEFAULT_FIELDS
                : []
        out.push(...fields)
        if (rule.operator === "value_drift" && typeof rule.referenceField === "string") out.push(rule.referenceField)
    }
    return out
}

/** Every path any ACTIVE authored rule reads — sorted, unique. */
export const RULE_READ_FIELDS: readonly string[] = [
    ...new Set(
        AUTHORED_GAP_DEFINITIONS.filter((d) => d.isActive).flatMap((d) => fieldsReadByDetectionLogic(d.detectionLogic))
    ),
].sort()
