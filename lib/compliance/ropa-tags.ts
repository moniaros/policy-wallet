/**
 * The Art. 30 record, derived from the schema rather than written beside it.
 *
 * PW-PROVENANCE-01 W4-01. The compliance pack (docs/compliance/DATA_PROTECTION_REVIEW_PACK.md
 * §14.2) records that no Art. 30 record of processing exists. Writing one as prose
 * would put it out of date on the next migration — which is how the gap arose in
 * the first place. So the record is GENERATED from `prisma/schema.prisma`, and a
 * guard fails the build when a model that holds personal data carries no tag.
 *
 * This is the repository's own rule applied to the data inventory: guards
 * enumerate their universe from the filesystem or the schema, never from a
 * hand-kept list. `tests/unit/erasure-covers-personal-data.test.ts` derives its
 * model list the same way, and this module deliberately reuses its parsing shape
 * so the two agree about what a model is.
 *
 * TAG FORMAT — one `///` line immediately above `model X {`:
 *
 *   /// @ropa purpose=<slug> basis=<slug> subjects=<slug|slug> retention=<slug> erasure=<slug> art9=<field,field|none>
 *
 * Placed on the MODEL, not per field. Art. 30(1)(c) asks for "categories of
 * personal data", not a column census; 87 models times their columns would be
 * ~1300 tags, and a tag written to satisfy a guard rather than to state a fact
 * is worse than no tag. Where a model mixes ordinary and special-category data,
 * `art9=` names the specific columns, which is the granularity that actually
 * carries legal weight.
 *
 * `unclear` IS A VALID VALUE, deliberately, for `purpose` and `basis`. The
 * alternative — a guard that only goes green once every model claims a lawful
 * basis — manufactures confident answers to open legal questions, which is the
 * one thing a record of processing must never do. `unclear` propagates into the
 * generated record as an explicit open question for counsel. Unknown is not
 * absence, and it must not render as certainty.
 */

/** Art. 6(1) bases, plus the honest non-answer. */
export const ROPA_BASES = [
    "contract", // Art. 6(1)(b)
    "consent", // Art. 6(1)(a) — and Art. 9(2)(a) where art9 is non-empty
    "legal_obligation", // Art. 6(1)(c)
    "legitimate_interest", // Art. 6(1)(f)
    "unclear", // not yet settled — surfaces as an open question, never as a claim
] as const
export type RopaBasis = (typeof ROPA_BASES)[number]

/** What the processing is FOR. Mirrors the purposes published at /privacy §3. */
export const ROPA_PURPOSES = [
    "service", // providing the wallet: accounts, storage, reminders
    "analysis", // AI analysis of policy documents and the risk model
    "intermediary", // sharing with the intermediary the customer chose
    "billing", // subscriptions, invoicing, metering
    "security", // authentication, abuse prevention, rate limiting
    "accountability", // consent and DSR records kept to evidence compliance
    "communication", // notifications and email the person asked for
    "unclear",
] as const
export type RopaPurpose = (typeof ROPA_PURPOSES)[number]

/** Whose data it is. An advisor's record about a customer is BOTH. */
export const ROPA_SUBJECTS = ["policyholder", "agent", "admin", "third_party"] as const
export type RopaSubject = (typeof ROPA_SUBJECTS)[number]

/** Retention classes, as published at /privacy §8. */
export const ROPA_RETENTIONS = [
    "account_life", // until the account is deleted
    "tax_5y", // 5 years after the tax year (invoices, billing records)
    "accountability_5y", // 5 years from completion (consent, DSR records)
    "technical_12m", // technical and usage logs
    "form_24m", // public-form submissions
    "session", // lives only as long as the session/challenge
    "advisor_own", // the intermediary's own record, under their own basis
    "unclear",
] as const
export type RopaRetention = (typeof ROPA_RETENTIONS)[number]

/** What `executeErasure` does to it. Must agree with the erasure guard. */
export const ROPA_ERASURES = [
    "delete", // rows removed
    "anonymize", // kept, identifying fields scrubbed
    "retained", // deliberately survives, with a documented basis
    "cascade", // removed with a parent that is itself deleted
] as const
export type RopaErasure = (typeof ROPA_ERASURES)[number]

export interface RopaTag {
    model: string
    purpose: RopaPurpose
    basis: RopaBasis
    subjects: RopaSubject[]
    retention: RopaRetention
    erasure: RopaErasure
    /** Column names holding Art. 9 data; empty when the model holds none. */
    art9: string[]
}

export interface RopaParseError {
    model: string
    problem: string
}

const TAG_LINE = /\/\/\/\s*@ropa\s+([^\n]+)/

/**
 * Models as the erasure guard sees them, plus whatever `///` block sits above.
 *
 * The doc comment is captured with the model because Prisma attaches `///` lines
 * to the declaration below them; a tag floating between two models belongs to the
 * second, and this regex reads it that way.
 */
export function modelBlocks(schema: string): { name: string; doc: string; body: string }[] {
    return [
        ...schema.matchAll(/((?:^\s*\/\/\/[^\n]*\n)*)model\s+(\w+)\s*\{([\s\S]*?)\n\}/gm),
    ].map((m) => ({ doc: m[1] ?? "", name: m[2], body: m[3] }))
}

function parseKeyValues(rest: string): Record<string, string> {
    const out: Record<string, string> = {}
    for (const [, k, v] of rest.matchAll(/(\w+)=([^\s]+)/g)) out[k] = v
    return out
}

/**
 * Parse one model's tag. Returns null when the model carries no `@ropa` line at
 * all — the guard decides whether that absence is allowed, not this function.
 */
export function parseRopaTag(
    name: string,
    doc: string
): { tag: RopaTag } | { errors: RopaParseError[] } | null {
    const line = doc.match(TAG_LINE)
    if (!line) return null

    const kv = parseKeyValues(line[1])
    const errors: RopaParseError[] = []
    const need = (key: string, allowed: readonly string[]): string => {
        const value = kv[key]
        if (!value) {
            errors.push({ model: name, problem: `missing ${key}=` })
            return ""
        }
        if (!allowed.includes(value)) {
            errors.push({
                model: name,
                problem: `${key}=${value} is not one of ${allowed.join(" | ")}`,
            })
            return ""
        }
        return value
    }

    const purpose = need("purpose", ROPA_PURPOSES) as RopaPurpose
    const basis = need("basis", ROPA_BASES) as RopaBasis
    const retention = need("retention", ROPA_RETENTIONS) as RopaRetention
    const erasure = need("erasure", ROPA_ERASURES) as RopaErasure

    const subjectsRaw = kv.subjects
    let subjects: RopaSubject[] = []
    if (!subjectsRaw) {
        errors.push({ model: name, problem: "missing subjects=" })
    } else {
        subjects = subjectsRaw.split("|") as RopaSubject[]
        for (const s of subjects) {
            if (!ROPA_SUBJECTS.includes(s)) {
                errors.push({ model: name, problem: `subjects=${s} is not one of ${ROPA_SUBJECTS.join(" | ")}` })
            }
        }
    }

    const art9Raw = kv.art9
    if (!art9Raw) errors.push({ model: name, problem: "missing art9= (use art9=none)" })
    const art9 = !art9Raw || art9Raw === "none" ? [] : art9Raw.split(",").map((f) => f.trim())

    // Art. 9 data may only rest on explicit consent here. A model naming Art. 9
    // columns under contract or legitimate interest is a claim the published
    // privacy policy does not make (/privacy §3: "for any health data, explicit
    // consent — Article 9(2)(a)"), so the guard refuses it rather than emitting
    // it into a record someone would rely on.
    if (art9.length > 0 && basis !== "consent" && basis !== "unclear") {
        errors.push({
            model: name,
            problem: `art9 columns present but basis=${basis}; Art. 9 requires explicit consent (9(2)(a)) or an honest 'unclear'`,
        })
    }

    if (errors.length > 0) return { errors }
    return { tag: { model: name, purpose, basis, subjects, retention, erasure, art9 } }
}

/** Every parsed tag in the schema, and every model whose tag failed to parse. */
export function collectRopaTags(schema: string): {
    tags: RopaTag[]
    errors: RopaParseError[]
    untagged: string[]
} {
    const tags: RopaTag[] = []
    const errors: RopaParseError[] = []
    const untagged: string[] = []

    for (const block of modelBlocks(schema)) {
        const parsed = parseRopaTag(block.name, block.doc)
        if (parsed === null) untagged.push(block.name)
        else if ("errors" in parsed) errors.push(...parsed.errors)
        else tags.push(parsed.tag)
    }
    return { tags, errors, untagged }
}

// ── Which models the record must cover ────────────────────────────────────────
//
// Deliberately the SAME detector the erasure guard uses: a model holds personal
// data when it carries a `@relation` to User under any name, or one of the plain
// string subject columns that has no relation behind it. Two guards disagreeing
// about what personal data is would be worse than either one being wrong.

const SUBJECT_FIELDS = [
    "userId",
    "ownerUserId",
    "subjectUserId",
    "policyholderUserId",
    "granterUserId",
    "changedByUserId",
    "targetUserId",
]

export function userRelationFields(body: string): string[] {
    return [
        ...body.matchAll(/^\s{2}\w+\s+User(?:\?|\[\])?\s+@relation\([^)]*fields:\s*\[([^\]]+)\]/gm),
    ].flatMap((m) => m[1].split(",").map((f) => f.trim()))
}

export function holdsSubjectData(body: string): boolean {
    if (userRelationFields(body).length > 0) return true
    return SUBJECT_FIELDS.some((f) => new RegExp(`^\\s{2}${f}\\s`, "m").test(body))
}

/** Models that must carry a tag: they hold personal data, or they are User itself. */
export function modelsRequiringTags(schema: string): string[] {
    return modelBlocks(schema)
        .filter((m) => m.name === "User" || holdsSubjectData(m.body))
        .map((m) => m.name)
}

// ── Columns, for the DPIA input pack (W4-02) ──────────────────────────────────
//
// The tag is per MODEL (D-P6); the pack still needs a per-column map, so the
// columns are read from the model body and each inherits its store's tag. A
// relation field is not a column — it is another table's row.

export interface ModelColumn {
    name: string
    /** Prisma type as written, with `[]` / `?` suffixes: `String?`, `Json`, `Decimal[]`. */
    type: string
    id: boolean
    unique: boolean
}

const SCALAR_TYPES = new Set(["String", "Int", "BigInt", "Boolean", "DateTime", "Decimal", "Float", "Json", "Bytes"])

/** Enum names declared in the schema — a column may be typed by one. */
export function enumNames(schema: string): string[] {
    return [...schema.matchAll(/^enum\s+(\w+)\s*\{/gm)].map((m) => m[1])
}

/** The scalar and enum columns of one model body, relations excluded. */
export function modelColumns(body: string, enums: readonly string[] = []): ModelColumn[] {
    const out: ModelColumn[] = []
    for (const line of body.split("\n")) {
        const m = line.match(/^\s{2}(\w+)\s+(\w+)(\[\]|\?)?\s*(.*)$/)
        if (!m) continue
        const [, name, base, suffix = "", attrs] = m
        if (!SCALAR_TYPES.has(base) && !enums.includes(base)) continue
        if (/@relation\b/.test(attrs)) continue
        out.push({ name, type: `${base}${suffix}`, id: /@id\b/.test(attrs), unique: /@unique\b/.test(attrs) })
    }
    return out
}

/** The columns that tie a row to a person: User relation keys plus the plain subject columns. */
export function subjectKeyFields(body: string): string[] {
    const plain = SUBJECT_FIELDS.filter((f) => new RegExp(`^\\s{2}${f}\\s`, "m").test(body))
    return [...new Set([...userRelationFields(body), ...plain])]
}
