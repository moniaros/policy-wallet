/**
 * Emit idempotent SQL for the canonical `plans` rows, generated from
 * prisma/plan-seed-data.ts (itself derived from lib/pricing/plan-defaults.ts)
 * — no database connection needed. Used to seed PRODUCTION plan rows on a
 * fresh environment (the full prisma/seed.ts is dev-only).
 *
 *   npx ts-node -P prisma/tsconfig.seed.json scripts/gen-plan-seed-sql.ts > plan-seed.sql
 *
 * Unlike gen-lookup-seed-sql.ts this emits ON CONFLICT DO NOTHING: once the
 * catalog is admin-managed (/admin/plans), a seed re-run must NEVER overwrite
 * prices, trials, visibility, or entitlements an admin has edited. Existing
 * rows are upgraded in place by the null-guarded backfills in migration
 * 20260719120000_plan_catalog_admin instead.
 */
import { PLAN_SEED } from '../prisma/plan-seed-data'

function q(value: string): string {
    return "'" + value.replace(/'/g, "''") + "'"
}
function qj(value: unknown): string {
    return q(JSON.stringify(value)) + '::jsonb'
}

const lines: string[] = []

for (const p of PLAN_SEED) {
    lines.push(
        `INSERT INTO plans (plan_id, plan_type, name, display_name, price, currency, billing_period, entitlements, tier_key, annual_price, trial_days, is_active, is_public, sort_order, version, created_at, updated_at) VALUES (` +
        [
            q(p.id),
            q(p.planType),
            q(p.name),
            q(p.displayName),
            String(p.price),
            q('EUR'),
            q(p.billingPeriod),
            qj(p.entitlements),
            q(p.tierKey),
            p.annualPrice != null ? String(p.annualPrice) : 'NULL',
            String(p.trialDays),
            String(p.isActive),
            String(p.isPublic),
            String(p.sortOrder),
            '1',
            'now()',
            'now()',
        ].join(', ') +
        `) ON CONFLICT (plan_id) DO NOTHING;`
    )
}

console.log(lines.join('\n'))
