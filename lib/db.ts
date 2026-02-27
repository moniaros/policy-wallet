import { PrismaClient } from "@prisma/client"

// Use DIRECT_URL (non-pooled, non-accelerate) to avoid P6001 errors in server components.
// DIRECT_URL is always a raw postgresql:// connection.
// DATABASE_URL may be a prisma:// Accelerate URL in production.
const dbUrl = process.env.DIRECT_URL || process.env.DATABASE_URL

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: dbUrl,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db
