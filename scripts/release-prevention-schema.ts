/** Bounded release operation: only the two dev-verified, additive prevention migrations. */
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync } from 'node:fs'

async function main() {
    const expectedProject = process.env.EXPECTED_DB_PROJECT
    if (!['lzqvtvjggylcujenlelh', 'cquudefwfwrmvpftuhyl'].includes(expectedProject ?? '')) throw new Error('Explicit known project required')
    const url = new URL(process.env.DIRECT_URL || '')
    if (!url.username.includes(expectedProject!) && !url.hostname.includes(expectedProject!)) throw new Error('Wrong database project')
    // Prisma migration advisory locks require a session, not transaction pooling.
    if (url.hostname.endsWith('.pooler.supabase.com')) url.port = '5432'
    url.searchParams.delete('pgbouncer')
    url.searchParams.set('connection_limit', '2')
    url.searchParams.set('pool_timeout', '20')
    process.env.DIRECT_URL = url.toString()
    process.env.DATABASE_URL = url.toString()
    delete process.env.POOLED_DATABASE_URL
    const { db } = await import('../lib/db')
    const local = readdirSync('prisma/migrations').filter(name => /^\d/.test(name))
    const allowed = new Set(['20261002120000_prevention_hub', '20261002160000_prevention_personalization'])
    const checksum = (name: string) => createHash('sha256').update(readFileSync(`prisma/migrations/${name}/migration.sql`)).digest('hex')
    const inspect = async () => {
        const rows = await db.$queryRaw<Array<{ migration_name: string; checksum: string; finished_at: Date | null; rolled_back_at: Date | null }>>`SELECT migration_name, checksum, finished_at, rolled_back_at FROM _prisma_migrations ORDER BY migration_name`
        if (rows.some(row => !row.finished_at && !row.rolled_back_at)) throw new Error('Unresolved failed migration')
        const applied = rows.filter(row => row.finished_at && !row.rolled_back_at)
        if (applied.some(row => !local.includes(row.migration_name) || checksum(row.migration_name) !== row.checksum)) throw new Error('Migration checksum or history drift')
        return { applied: applied.length, pending: local.filter(name => !applied.some(row => row.migration_name === name)) }
    }
    try {
        const before = await inspect()
        console.log(JSON.stringify({ project: expectedProject, phase: 'before', ...before }))
        if (before.pending.some(name => !allowed.has(name))) throw new Error('Unexpected pending migration; release must be reviewed')
        if (before.pending.length) {
            if (!process.argv.includes('--apply')) throw new Error('Pending migrations; explicit --apply required')
            for (const name of before.pending) {
                const sql = readFileSync(`prisma/migrations/${name}/migration.sql`, 'utf8')
                if (/\b(DROP|DELETE|TRUNCATE)\b/i.test(sql)) throw new Error('This release operation accepts only additive migrations')
            }
            await db.$disconnect()
            execFileSync('node_modules/.bin/prisma', ['migrate', 'deploy'], { stdio: 'inherit', env: process.env })
        }
        const after = await inspect()
        if (after.pending.length) throw new Error('Migrations still pending')
        const tables = await db.$queryRaw<Array<{ relname: string; relrowsecurity: boolean }>>`SELECT relname, relrowsecurity FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relname IN ('prevention_progress','prevention_check_ins','prevention_benefit_uses') ORDER BY relname`
        const columns = await db.$queryRaw<Array<{ column_name: string }>>`SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name IN ('prevention_progress','prevention_check_ins','prevention_benefit_uses')`
        const fks = await db.$queryRaw<Array<{ confdeltype: string }>>`SELECT confdeltype FROM pg_constraint WHERE conrelid IN ('prevention_progress'::regclass,'prevention_check_ins'::regclass,'prevention_benefit_uses'::regclass) AND contype = 'f'`
        if (tables.length !== 3 || tables.some(table => !table.relrowsecurity) || columns.length !== 34 || fks.length !== 5 || fks.some(fk => fk.confdeltype !== 'c')) throw new Error('Prevention schema verification failed')
        console.log(JSON.stringify({ project: expectedProject, phase: 'verified', ...after, tables, columns: columns.length, cascadeForeignKeys: fks.length }))
    } finally { await db.$disconnect() }
}

main().catch(error => {
    const message = error instanceof Error ? error.message : 'Schema release failed'
    console.error(message.replace(/postgres(?:ql)?:\/\/\S+/g, '[redacted connection]'))
    process.exitCode = 1
})
