// Dump whole tables to a restorable .sql archive (docs/archive/).
// Usage: npx tsx scripts/ops/dump-tables.mjs <outfile> <table> [table...]
import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';

const [out, ...tables] = process.argv.slice(2);
const db = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });

const ref = (process.env.DIRECT_URL || '').match(/postgres\.([a-z]+)/)?.[1] ?? 'unknown';
const parts = [
  `-- PolicyWallet table archive`,
  `-- source: supabase:${ref}`,
  `-- tables: ${tables.join(', ')}`,
  ``,
];

for (const t of tables) {
  const rows = await db.$queryRawUnsafe(
    `SELECT format('INSERT INTO %I SELECT * FROM json_populate_record(NULL::%I, %L);', $1, $1, row_to_json(x)::text) AS stmt FROM ${t} x`,
    t
  );
  parts.push(`-- ${t}: ${rows.length} rows`);
  parts.push(...rows.map(r => r.stmt));
  parts.push('');
  console.log(`${t}: ${rows.length} rows`);
}

fs.writeFileSync(out, parts.join('\n'));
await db.$disconnect();
console.log('wrote', out);
