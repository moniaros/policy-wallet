// Emit plan rows in the shape verify-plan-entitlements.ts --from-json expects.
import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import crypto from 'node:crypto';
const db = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });
const rows = await db.$queryRawUnsafe(`
  SELECT plan_id AS id, plan_type AS "planType", name, tier_key AS "tierKey", entitlements
  FROM plans ORDER BY plan_type, plan_id`);
fs.writeFileSync(process.argv[2], JSON.stringify(rows, null, 2));
const fp = rows.map(r => `${r.id}|${r.tierKey}|${JSON.stringify(r.entitlements)}`).join('\n');
console.log('rows:', rows.length);
console.log('fingerprint md5:', crypto.createHash('md5').update(fp).digest('hex'));
await db.$disconnect();
