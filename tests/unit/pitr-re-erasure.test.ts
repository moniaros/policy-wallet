import { beforeEach, describe, expect, it, vi } from "vitest"

const dbMock = vi.hoisted(() => ({ deletionRequest: { findMany: vi.fn() }, jobRun: { findMany: vi.fn() } }))
vi.mock("@/lib/db", () => ({ db: dbMock }))
vi.mock("@/lib/services/gdpr-erasure.service", () => ({ eraseUserData: vi.fn() }))

import { readFileSync } from "node:fs"

import { PITR_JOB_NAME, RE_ERASURE_STATUS, restorePointAlreadyHandled, restorePointFromEnv, runPitrReErasure } from "@/lib/jobs/pitr-re-erasure"

/**
 * PW-PROVENANCE-01 R-02. The job re-executes ONLY erasures that had happened
 * before a restore undid them. Its universe is the `DeletionRequestStatus`
 * enum, read from prisma/schema.prisma rather than listed here: for every
 * status the schema declares, exactly `completed` rows after the restore
 * point reach the eraser. The registration (cron + inventory) is asserted from
 * the files that drive it.
 */

const RESTORE = new Date("2026-09-10T12:00:00Z")
const after = (iso: string) => ({ completedAt: new Date(iso) })

function statusesFromSchema(): string[] {
    const schema = readFileSync("prisma/schema.prisma", "utf-8")
    const block = schema.match(/enum DeletionRequestStatus \{([\s\S]*?)\n\}/)
    if (!block) throw new Error("DeletionRequestStatus enum not found")
    return block[1].split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("//"))
}

beforeEach(() => {
    vi.clearAllMocks()
    dbMock.jobRun.findMany.mockResolvedValue([])
})

describe("what the job re-executes", () => {
    it("the query asks for exactly the completed status after the restore point — every other status in the schema is outside it", async () => {
        const statuses = statusesFromSchema()
        expect(statuses).toContain("completed")
        expect(statuses.length).toBeGreaterThan(3)
        dbMock.deletionRequest.findMany.mockResolvedValue([])
        await runPitrReErasure(RESTORE, { alreadyHandled: async () => false })
        const where = dbMock.deletionRequest.findMany.mock.calls[0][0].where
        expect(where.status).toBe(RE_ERASURE_STATUS)
        expect(where.completedAt).toEqual({ gt: RESTORE })
        for (const s of statuses.filter((s) => s !== "completed")) expect(where.status, s).not.toBe(s)
    })

    it("re-executes each candidate once, records a request whose user is gone, and keeps going past a failure", async () => {
        dbMock.deletionRequest.findMany.mockResolvedValue([
            { id: "r1", userId: "u1", ...after("2026-09-10T13:00:00Z") },
            { id: "r2", userId: null, ...after("2026-09-10T14:00:00Z") },
            { id: "r3", userId: "u3", ...after("2026-09-10T15:00:00Z") },
            { id: "r4", userId: "u4", ...after("2026-09-10T16:00:00Z") },
        ])
        const erased: string[] = []
        const erase = vi.fn(async (userId: string) => {
            if (userId === "u3") throw new Error("boom")
            erased.push(userId)
        })
        const out = await runPitrReErasure(RESTORE, { erase, alreadyHandled: async () => false })
        expect(out).toMatchObject({ outcome: "executed", restorePoint: RESTORE.toISOString(), candidates: 4, reExecuted: ["r1", "r4"], withoutUser: ["r2"] })
        expect(out.failures).toEqual([{ requestId: "r3", userId: "u3", error: "boom" }])
        expect(erased).toEqual(["u1", "u4"])
        expect(erase).toHaveBeenCalledTimes(3)
    })

    it("no restore point → nothing touched, recorded as such; an already-handled point → skipped", async () => {
        const erase = vi.fn()
        expect(await runPitrReErasure(null, { erase })).toMatchObject({ outcome: "no_restore_point", candidates: 0 })
        expect(await runPitrReErasure(RESTORE, { erase, alreadyHandled: async () => true })).toMatchObject({ outcome: "already_done", candidates: 0 })
        expect(erase).not.toHaveBeenCalled()
        expect(dbMock.deletionRequest.findMany).not.toHaveBeenCalled()
    })

    it("a restore point counts as handled only by a succeeded, failure-free, executed run for that exact instant", async () => {
        const iso = RESTORE.toISOString()
        dbMock.jobRun.findMany.mockResolvedValue([
            { summary: { restorePoint: "2026-09-01T00:00:00.000Z", outcome: "executed", failures: [] } },
            { summary: { restorePoint: iso, outcome: "executed", failures: [{ requestId: "r3" }] } },
        ])
        expect(await restorePointAlreadyHandled(RESTORE)).toBe(false)
        dbMock.jobRun.findMany.mockResolvedValue([{ summary: { restorePoint: iso, outcome: "executed", failures: [] } }])
        expect(await restorePointAlreadyHandled(RESTORE)).toBe(true)
        expect(dbMock.jobRun.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { jobName: PITR_JOB_NAME, status: "succeeded" } }))
    })

    it("reads the restore point from the environment; an unparsable value is absent", () => {
        expect(restorePointFromEnv({})).toBeNull()
        expect(restorePointFromEnv({ PITR_RESTORE_POINT: "not a date" })).toBeNull()
        expect(restorePointFromEnv({ PITR_RESTORE_POINT: "2026-09-10T12:00:00Z" })?.toISOString()).toBe("2026-09-10T12:00:00.000Z")
    })
})

describe("the job is wired like the other crons", () => {
    it("is scheduled in vercel.json and inventoried with the same policy as the retention sweep", () => {
        const vercel = JSON.parse(readFileSync("vercel.json", "utf-8"))
        const cron = vercel.crons.find((c: { path: string }) => c.path === "/api/v1/jobs/pitr-re-erasure")
        expect(cron?.schedule).toMatch(/^\d+ \d+ \* \* \*$/)
        const inventory = JSON.parse(readFileSync("scripts/api-route-policy-inventory.json", "utf-8"))
        const mine = inventory.routes.find((r: { route: string }) => r.route === "v1/jobs/pitr-re-erasure/route.ts")
        const ref = inventory.routes.find((r: { route: string }) => r.route === "v1/jobs/privacy-retention/route.ts")
        expect(mine?.policy).toEqual(ref?.policy)
    })

    it("probe — a job that re-executed on any status would be caught by the universe check", async () => {
        // The universe check reads the schema's enum; here the query is asserted
        // against a status that is NOT `completed`, which is what a lax filter would let through.
        dbMock.deletionRequest.findMany.mockResolvedValue([])
        await runPitrReErasure(RESTORE, { alreadyHandled: async () => false })
        const where = dbMock.deletionRequest.findMany.mock.calls[0][0].where
        expect(where.status).not.toBe("failed")
        expect(where.status).not.toBe("processing")
    })
})
