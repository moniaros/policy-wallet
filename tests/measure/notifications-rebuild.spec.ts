/**
 * PW-MOBILE-TRANSFORM-02, Phase 5 — Ειδοποιήσεις `/notifications` rebuild gate.
 *
 * Measures the §10.2 acceptance battery BEFORE and AFTER the surface rebuild,
 * on the same spec, distinguished only by MEASURE_RUN:
 *
 *   MEASURE_RUN=p5-rebuild-baseline npx playwright test --project=measure notifications-rebuild
 *   MEASURE_RUN=p5-rebuild-after    npx playwright test --project=measure notifications-rebuild
 *
 * Metrics: everything `captureSurface` already runs (scrollHeight, sections,
 * containers+depth, duplicateFacts both channels, identity rows, sub-44 taps,
 * 1.4.3/1.4.11 contrast, truncation, pageOverflow, leak/Latin probes) PLUS the
 * two Phase-5 §11 metrics from ./metrics — `duplicateActions` and
 * `countConsistency` — and `clippedLabels`. All shared definitions; nothing is
 * redefined here (the failure section-collector.ts exists to prevent).
 *
 * STATES — a state of this surface is the account's notificationEvent rows:
 *
 *   `populated` — the shared paid account's real accumulated history, plus the
 *     standing P1-04 channel-duplicate fixture (idempotent), with the fixture's
 *     two in-app rows forced unread so the unread affordances (bold title,
 *     accent border, «Σήμανση όλων») deterministically render.
 *   `all-read`  — every in-app row read-stamped: the unread affordances and the
 *     mark-all control must leave, and nothing may imply "all clear" beyond
 *     "nothing unread".
 *   `empty`     — zero rows. The list must SAY it is empty, not imply all-clear
 *     (CLAUDE.md: absence of a finding is never reassurance).
 *
 *   Failed/unavailable is documented as UNREACHABLE rather than silently
 *   skipped: `page.tsx`'s `!data` branch requires getNotificationData to
 *   return null, which happens only for an unauthenticated caller — whom
 *   proxy.ts redirects to /auth/signin before the page runs. `error.tsx`
 *   requires a server exception (a dead DB), which cannot be staged without
 *   taking the whole dev stack down mid-suite. Per-event delivery FAILURE
 *   (status: "failed") deliberately does not render: delivery bookkeeping is
 *   not customer-facing (§2.7 / ledger N-04), so there is no degraded render
 *   to measure there.
 *
 * The account is restored EXACTLY: all rows are snapshotted up front (memory +
 * a disk backup in the session scratchpad), every mutation happens between
 * snapshot and the final delete-and-recreate, so the last restore returns the
 * account to the byte-identical pre-spec state, readAt included.
 */
import { test } from "@playwright/test"
import { mkdirSync, writeFileSync } from "fs"
import path from "path"
import { applyNotificationDuplicateFixture } from "./dashboard-fixtures"
import { evidenceDirs, ensureDirs, openSurface, captureSurface, withDb } from "./surface-harness"
import { duplicateActions, countConsistency, clippedLabels } from "./metrics"

const WIDTHS = [320, 390, 430] as const
const EMAIL = "e2e-ph@policywallet.test"
const dirs = evidenceDirs("notifications")
const READY = ".pw-page-shell h1, main h1, h1"

// Crash-safe copy of the snapshot, outside the repo so it can never be
// committed. If the worker dies between the empty-state delete and the
// restore, this file is the recovery path (dates are ISO strings there —
// map through `new Date` when restoring by hand).
const BACKUP_DIR = "/private/tmp/claude-501/-Users-yannismoniaros-Workspace-policywallet-policy-wallet/e4c02ebe-5380-4390-b3c7-a82cf6d26fb8/scratchpad"
const BACKUP_FILE = path.join(BACKUP_DIR, "notification-events-e2e-ph-backup.json")

type EventRow = Record<string, any>
let snapshot: EventRow[] | null = null
let userId: string | null = null
let rowsDeleted = false

async function restoreFromSnapshot(db: any): Promise<void> {
    if (!snapshot || !userId) throw new Error("restoreFromSnapshot: no snapshot taken")
    await db.notificationEvent.deleteMany({ where: { userId } })
    if (snapshot.length > 0) {
        await db.notificationEvent.createMany({ data: snapshot })
    }
    rowsDeleted = false
}

/** One settled page → the full battery, extras included, one JSON + one PNG. */
async function measureState(page: any, state: string, width: (typeof WIDTHS)[number]) {
    await openSurface(page, "/notifications", width, READY)
    const acts = await duplicateActions(page)
    const counts = await countConsistency(page)
    const clipped = await clippedLabels(page)
    const data = await captureSurface(
        page,
        dirs,
        `rebuild-${state}`,
        width,
        [],
        {
            tier: "paid",
            state,
            duplicateActions: acts,
            countConsistency: counts,
            clippedLabels: clipped,
        },
        200
    )
    console.log(
        `[measure-extra] rebuild-${state}@${width}: dupActions=${acts.duplicateActionCount} ` +
        `(groups=${acts.groups.length}, navOverlap=${acts.navOverlapCount}, unidentifiable=${acts.unidentifiable}) ` +
        `countVerdict=${counts.verdict} inconsistent=${counts.failures} ` +
        `unmeasurable=${counts.unmeasurable.length} clippedLabels=${clipped.length}`
    )
    return data
}

test.describe.configure({ mode: "serial" })

test.beforeAll(async () => {
    ensureDirs(dirs)
    await withDb(async (db) => {
        const owner = await db.user.findUnique({ where: { email: EMAIL }, select: { id: true } })
        if (!owner) throw new Error(`${EMAIL} not provisioned — run global-setup first`)
        userId = owner.id
        snapshot = await db.notificationEvent.findMany({ where: { userId: owner.id } })
        mkdirSync(BACKUP_DIR, { recursive: true })
        writeFileSync(BACKUP_FILE, JSON.stringify({ userId: owner.id, rows: snapshot }, null, 2))
        console.log(`[fixture] snapshot: ${snapshot!.length} notificationEvent rows → ${BACKUP_FILE}`)
    })
})

test.afterAll(async () => {
    // Safety net only: test 3 restores on its own success path. This fires if
    // the empty-state test died between delete and restore.
    if (rowsDeleted) {
        await withDb(restoreFromSnapshot)
        console.log("[fixture] afterAll recovery restore ran")
    }
})

test("state: populated (history + channel-duplicate fixture, unread present)", async ({ page }) => {
    test.setTimeout(6 * 60_000)
    await withDb(async (db) => {
        await applyNotificationDuplicateFixture(db, EMAIL)
        // Deterministic unread: the fixture's two in-app rows. Original readAt
        // values return with the final delete-and-recreate restore.
        await db.notificationEvent.updateMany({
            where: {
                userId: userId!,
                channel: "in_app",
                eventType: { in: ["document_requested", "questionnaire_sent"] },
            },
            data: { readAt: null },
        })
    })
    for (const width of WIDTHS) await measureState(page, "populated", width)
})

test("state: all-read (no unread affordances, no false all-clear)", async ({ page }) => {
    test.setTimeout(6 * 60_000)
    await withDb(async (db) => {
        await db.notificationEvent.updateMany({
            where: { userId: userId!, channel: "in_app", readAt: null },
            data: { readAt: new Date() },
        })
    })
    for (const width of WIDTHS) await measureState(page, "all-read", width)
})

test("state: empty (zero rows — must say empty, not all-clear)", async ({ page }) => {
    test.setTimeout(6 * 60_000)
    await withDb(async (db) => {
        await db.notificationEvent.deleteMany({ where: { userId: userId! } })
        rowsDeleted = true
    })
    try {
        for (const width of WIDTHS) await measureState(page, "empty", width)
    } finally {
        await withDb(restoreFromSnapshot)
        console.log("[fixture] account restored to pre-spec state")
    }
})
