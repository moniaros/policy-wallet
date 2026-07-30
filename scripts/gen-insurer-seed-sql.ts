/**
 * Emit idempotent SQL that imports the Greek insurer reference dataset
 * (prisma/greek-insurers.json) into the insurers table — no database
 * connection needed. Used to seed PRODUCTION reference rows (prisma/seed.ts
 * is dev-only).
 *
 *   npx ts-node -P prisma/tsconfig.seed.json scripts/gen-insurer-seed-sql.ts > insurer-seed.sql
 *
 * Four passes, in emitted order:
 *   A. Claim rows already bearing a canonical name (slug backfill) — adopts
 *      admin-created duplicates and makes re-runs idempotent.
 *   B. Rename the legacy seeded rows (Ergo → ERGO Ασφαλιστική, …), guarded by
 *      NOT EXISTS so a name collision leaves the legacy row as an orphan for a
 *      human decision instead of failing mid-batch.
 *   C. Upsert every non-merged record keyed on slug (deterministic
 *      "seed_<slug>" ids). Historic status='merged' entities are skipped.
 *   D. Deactivate the legacy AXA row — the ONLY statement touching is_active.
 *
 * Re-running the output refreshes dataset-owned fields from the dataset, EXCEPT
 * where an admin has corrected the value in /admin/insurers (field stamped
 * admin_edited): those survive, as do is_active, logo_url and insurer_id, which
 * the upsert never writes at all.
 */
import dataset from "../prisma/greek-insurers.json"

export interface GreekInsurerRecord {
    id: string
    name_el: string
    name_en: string | null
    legal_name_el: string | null
    status: string
    group_parent: string | null
    website: string | null
    call_center: string | null
    claims_phone: string | null
    roadside_phone: string | null
    payment_gateway_url: string | null
    contact_email: string | null
    hq_address: Record<string, string | null> | null
    roadside_assistance_provider: string | null
    lines_of_business: string[]
    field_confidence: Record<string, string> | null
    notes: string | null
}

/**
 * Legacy row names (dev seeds + admin-created prod rows, verified against
 * prod on 2026-07-30) → the dataset record that absorbs them.
 */
export const LEGACY_MERGES: { legacyName: string; slug: string }[] = [
    { legacyName: "Interamerican", slug: "interamerican" },
    { legacyName: "Generali", slug: "generali-hellas" },
    { legacyName: "Allianz", slug: "allianz-europaiki-pisti" },
    { legacyName: "Ergo", slug: "ergo" },
    { legacyName: "Groupama", slug: "groupama" },
    { legacyName: "NN", slug: "nn-hellas" },
]

/** Legacy rows deactivated instead of merged (historic entities not imported). */
export const LEGACY_DEACTIVATIONS = ["AXA"]

function q(value: string): string {
    return "'" + value.replace(/'/g, "''") + "'"
}
function qOrNull(value: string | null | undefined): string {
    return value == null ? "NULL" : q(value)
}
function qj(value: unknown): string {
    return q(JSON.stringify(value)) + "::jsonb"
}
function textArray(values: string[]): string {
    return values.length > 0 ? "ARRAY[" + values.map(q).join(",") + "]::text[]" : "'{}'::text[]"
}

const CONFIDENCE_KEY_MAP: Record<string, string> = {
    website: "website",
    call_center: "callCenter",
    claims_phone: "claimsPhone",
    roadside_phone: "roadsidePhone",
    payment_gateway_url: "paymentGatewayUrl",
    contact_email: "contactEmail",
    hq_address: "hqAddress",
    roadside_assistance_provider: "roadsideAssistanceProvider",
    lines_of_business: "linesOfBusiness",
}

/** snake_case dataset keys → the camelCase Prisma field names the UI reads. */
function mapConfidenceKeys(confidence: Record<string, string> | null): Record<string, string> | null {
    if (!confidence) return null
    const mapped: Record<string, string> = {}
    for (const [key, value] of Object.entries(confidence)) {
        const camel = CONFIDENCE_KEY_MAP[key] ?? key.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
        mapped[camel] = value
    }
    return mapped
}

/** { street, city, postal_code, country } → camelCase, null entries dropped. */
function mapAddress(address: Record<string, string | null> | null): Record<string, string> | null {
    if (!address) return null
    const mapped: Record<string, string> = {}
    if (address.street != null) mapped.street = address.street
    if (address.city != null) mapped.city = address.city
    if (address.postal_code != null) mapped.postalCode = address.postal_code
    if (address.country != null) mapped.country = address.country
    return Object.keys(mapped).length > 0 ? mapped : null
}

/**
 * Dataset-owned columns, paired with the camelCase key the confidence map and
 * the admin form use for the same field.
 */
const UPSERT_FIELDS: { column: string; confidenceKey: string }[] = [
    { column: "name", confidenceKey: "name" },
    { column: "name_en", confidenceKey: "nameEn" },
    { column: "legal_name_el", confidenceKey: "legalNameEl" },
    { column: "status", confidenceKey: "status" },
    { column: "group_parent", confidenceKey: "groupParent" },
    { column: "website", confidenceKey: "website" },
    { column: "call_center", confidenceKey: "callCenter" },
    { column: "claims_phone", confidenceKey: "claimsPhone" },
    { column: "roadside_phone", confidenceKey: "roadsidePhone" },
    { column: "payment_gateway_url", confidenceKey: "paymentGatewayUrl" },
    { column: "contact_email", confidenceKey: "contactEmail" },
    { column: "hq_address", confidenceKey: "hqAddress" },
    { column: "roadside_assistance_provider", confidenceKey: "roadsideAssistanceProvider" },
    { column: "lines_of_business", confidenceKey: "linesOfBusiness" },
    { column: "notes", confidenceKey: "notes" },
]

/**
 * A field an admin has explicitly corrected in /admin/insurers is stamped
 * admin_edited in field_confidence; a re-import must NOT throw that work away.
 * So each dataset-owned column keeps the live value where the admin edited it
 * and takes the dataset value everywhere else — the dataset stays canonical
 * for everything nobody has touched. field_confidence is merged the same way
 * so the admin_edited stamps survive and keep protecting their fields.
 *
 * is_active, logo_url and insurer_id are never in this list: they are
 * admin-owned outright and the upsert never writes them.
 */
const CONFLICT_UPDATE_ASSIGNMENTS = [
    ...UPSERT_FIELDS.map(
        ({ column, confidenceKey }) =>
            `${column} = CASE WHEN insurers.field_confidence->>'${confidenceKey}' = 'admin_edited' ` +
            `THEN insurers.${column} ELSE EXCLUDED.${column} END`
    ),
    `field_confidence = COALESCE(EXCLUDED.field_confidence, '{}'::jsonb) || COALESCE(` +
        `(SELECT jsonb_object_agg(key, value) FROM jsonb_each_text(insurers.field_confidence) ` +
        `WHERE value = 'admin_edited'), '{}'::jsonb)`,
].join(", ")

export function buildInsurerSeedStatements(records: GreekInsurerRecord[]): string[] {
    const bySlug = new Map(records.map((r) => [r.id, r]))
    const statements: string[] = []

    // Pass A — claim any existing row already carrying a record's canonical
    // name (slug backfill for EVERY imported record, not just merge targets:
    // prod has admin-created rows like «Εθνική Ασφαλιστική» that would
    // otherwise collide on unique(name) at insert time).
    for (const record of records) {
        if (record.status === "merged") continue
        statements.push(
            `UPDATE insurers SET slug = ${q(record.id)}, updated_at = now() ` +
                `WHERE slug IS NULL AND name = ${q(record.name_el)};`
        )
    }

    // Pass B — rename legacy rows whose name actually changes, collision-guarded.
    for (const merge of LEGACY_MERGES) {
        const record = bySlug.get(merge.slug)
        if (!record) continue
        if (record.name_el === merge.legacyName) continue // claimed by Pass A already
        statements.push(
            `UPDATE insurers SET slug = ${q(merge.slug)}, name = ${q(record.name_el)}, updated_at = now() ` +
                `WHERE slug IS NULL AND name = ${q(merge.legacyName)} ` +
                `AND NOT EXISTS (SELECT 1 FROM insurers WHERE slug = ${q(merge.slug)} OR name = ${q(record.name_el)});`
        )
    }

    // Pass C — upsert every non-merged record keyed on slug.
    for (const record of records) {
        if (record.status === "merged") continue
        const address = mapAddress(record.hq_address)
        const confidence = mapConfidenceKeys(record.field_confidence)
        statements.push(
            `INSERT INTO insurers (insurer_id, name, slug, name_en, legal_name_el, status, group_parent, ` +
                `website, call_center, claims_phone, roadside_phone, payment_gateway_url, contact_email, ` +
                `hq_address, roadside_assistance_provider, lines_of_business, field_confidence, notes, ` +
                `is_active, created_at, updated_at) VALUES (` +
                [
                    q("seed_" + record.id),
                    q(record.name_el),
                    q(record.id),
                    qOrNull(record.name_en),
                    qOrNull(record.legal_name_el),
                    q(record.status),
                    qOrNull(record.group_parent),
                    qOrNull(record.website),
                    qOrNull(record.call_center),
                    qOrNull(record.claims_phone),
                    qOrNull(record.roadside_phone),
                    qOrNull(record.payment_gateway_url),
                    qOrNull(record.contact_email),
                    address ? qj(address) : "NULL",
                    qOrNull(record.roadside_assistance_provider),
                    textArray(record.lines_of_business),
                    confidence ? qj(confidence) : "NULL",
                    qOrNull(record.notes),
                    "true",
                    "now()",
                    "now()",
                ].join(", ") +
                `) ON CONFLICT (slug) DO UPDATE SET ` +
                CONFLICT_UPDATE_ASSIGNMENTS +
                `, updated_at = now();`
        )
    }

    // Pass D — deactivate legacy historic rows (never renamed, never imported).
    for (const legacyName of LEGACY_DEACTIVATIONS) {
        statements.push(
            `UPDATE insurers SET is_active = false, updated_at = now() ` +
                `WHERE name = ${q(legacyName)} AND slug IS NULL;`
        )
    }

    return statements
}

const records = (dataset as unknown as { insurers: GreekInsurerRecord[] }).insurers

if (process.argv[1]?.includes("gen-insurer-seed-sql")) {
    const statements = buildInsurerSeedStatements(records)
    const skipped = records.filter((r) => r.status === "merged")
    process.stderr.write(
        `records: ${records.length}, imported: ${records.length - skipped.length}, ` +
            `skipped (merged): ${skipped.map((r) => r.id).join(", ")}, statements: ${statements.length}\n`
    )
    console.log(statements.join("\n"))
}
