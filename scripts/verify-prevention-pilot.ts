import { db } from '../lib/db'
async function main() {
    const expected = 'lzqvtvjggylcujenlelh'
    const url = new URL(process.env.DIRECT_URL || '')
    if (!url.username.includes(expected)) throw new Error('This pilot verifier is development-only')
    const tables = await db.$queryRaw<Array<{ relname: string; relrowsecurity: boolean }>>`SELECT relname, relrowsecurity FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relname IN ('prevention_progress','prevention_check_ins','prevention_benefit_uses') ORDER BY relname`
    if (tables.length !== 3 || tables.some(t => !t.relrowsecurity)) throw new Error('Missing tables or row-level security')
    const columns = await db.$queryRaw<Array<{ table_name: string; column_name: string }>>`SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name IN ('prevention_progress','prevention_check_ins','prevention_benefit_uses')`
    const fks = await db.$queryRaw<Array<{ conname: string; confdeltype: string }>>`SELECT conname, confdeltype FROM pg_constraint WHERE conrelid IN ('prevention_progress'::regclass,'prevention_check_ins'::regclass,'prevention_benefit_uses'::regclass) AND contype = 'f'`
    if (columns.length !== 34 || fks.length !== 5 || fks.some(f => f.confdeltype !== 'c')) throw new Error('Unexpected schema or cascade constraints')
    console.log(JSON.stringify({ developmentProject: expected, tables, columns: columns.length, cascadeForeignKeys: fks.length }))
}
main().finally(() => db.$disconnect())
