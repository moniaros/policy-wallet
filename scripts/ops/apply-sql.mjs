import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
const db = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });
const sql = fs.readFileSync(process.argv[2], 'utf8');
const n = await db.$executeRawUnsafe(sql);
console.log('rows affected:', n);
await db.$disconnect();
