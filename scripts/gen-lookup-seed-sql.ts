/**
 * Emit idempotent SQL for the InsuranceType + InsuranceProduct lookup
 * tables, generated from the canonical taxonomy and the shared product
 * catalog — no database connection needed. Used to seed PRODUCTION lookup
 * rows (the full prisma/seed.ts is dev-only: it also creates demo users
 * and policies which must never reach prod).
 *
 *   npx ts-node -P prisma/tsconfig.seed.json scripts/gen-lookup-seed-sql.ts > lookup-seed.sql
 *
 * Ids are deterministic ("seed_" + slug / lob_category), so re-running the
 * SQL upserts in place.
 */
import { INSURANCE_BRANCHES } from '../lib/insurance/taxonomy'
import { PRODUCT_CATALOG } from '../prisma/product-catalog'

function q(value: string): string {
    return "'" + value.replace(/'/g, "''") + "'"
}
function qj(value: unknown): string {
    return q(JSON.stringify(value)) + '::jsonb'
}

const lines: string[] = []

for (const branch of INSURANCE_BRANCHES.filter((b) => b.writeEnabled)) {
    const name = `${branch.label.en} (${branch.label.el})`
    lines.push(
        `INSERT INTO insurance_types (type_id, name, slug, is_active, created_at, updated_at) VALUES (${q('seed_' + branch.id)}, ${q(name)}, ${q(branch.id)}, true, now(), now()) ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, updated_at = now();`
    )
}

for (const p of PRODUCT_CATALOG) {
    const id = `seed_${p.lineOfBusiness}_${p.category}`
    const tags = p.idealProfileTags.length > 0
        ? 'ARRAY[' + p.idealProfileTags.map(q).join(',') + ']::text[]'
        : "'{}'::text[]"
    lines.push(
        `INSERT INTO insurance_products (product_id, line_of_business, name, description, category, estimated_annual_premium, premium_range_low, premium_range_high, key_benefits, ideal_profile_tags, urgency_for_profiles, greek_market_popularity, is_active, sort_order, created_at, updated_at) VALUES (` +
        [
            q(id),
            q(p.lineOfBusiness),
            qj(p.name),
            qj(p.description),
            q(p.category),
            String(p.estimatedAnnualPremium),
            p.premiumRangeLow != null ? String(p.premiumRangeLow) : 'NULL',
            p.premiumRangeHigh != null ? String(p.premiumRangeHigh) : 'NULL',
            qj(p.keyBenefits),
            tags,
            q(p.urgencyForProfiles),
            String(p.greekMarketPopularity),
            'true',
            String(p.sortOrder),
            'now()',
            'now()',
        ].join(', ') +
        `) ON CONFLICT (product_id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, key_benefits = EXCLUDED.key_benefits, ideal_profile_tags = EXCLUDED.ideal_profile_tags, estimated_annual_premium = EXCLUDED.estimated_annual_premium, premium_range_low = EXCLUDED.premium_range_low, premium_range_high = EXCLUDED.premium_range_high, urgency_for_profiles = EXCLUDED.urgency_for_profiles, greek_market_popularity = EXCLUDED.greek_market_popularity, sort_order = EXCLUDED.sort_order, updated_at = now();`
    )
}

console.log(lines.join('\n'))
