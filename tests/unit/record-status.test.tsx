import { describe, expect, it } from "vitest"
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"
import { render } from "@testing-library/react"
import { RECORD_STATUSES, extractionConfirmation, resolveRecordStatus, type RecordStatus } from "@/lib/wallet/record-status"
import { RecordStatusLabel, recordNeedLine, recordStatusLabel } from "@/components/records/RecordStatusLabel"
import { el } from "@/lib/i18n/translations/el"
import { en } from "@/lib/i18n/translations/en"

/**
 * B1 — the record status (PW-TRANSPARENCY-02).
 *
 * Measured across {motor, health, property} × {clean, partial, failed,
 * unanalysed, expired}: the status describes the record, never the person;
 * no status derives from a finding count; `confirmed` is unreachable until C1
 * (every caller passes `confirmedAt: null`, asserted from source); the label
 * is text in one neutral shape for all five states, in both locales, and no
 * label for a failed or unanalysed record reads as reassurance.
 */
const REASSURANCE = /Σε καλή κατάσταση|Εντάξει|Επαρκής|Προστατευμέν|Καλή κάλυψη|all clear|\bgood\b|\bfine\b|protected|covered/i
const BRANCHES = ["motor", "health", "home"]
const STATES = {
    clean: { lifecycleStatus: "active", latestRun: { status: "completed" } },
    partial: { lifecycleStatus: "active", latestRun: { status: "completed_with_warnings" } },
    failed: { lifecycleStatus: "active", latestRun: { status: "failed" } },
    unanalysed: { lifecycleStatus: "active", latestRun: null },
    expired: { lifecycleStatus: "expired", latestRun: { status: "completed" } },
} as const
const EXPECTED: Record<keyof typeof STATES, RecordStatus> = {
    clean: "awaiting_confirmation",
    partial: "awaiting_confirmation",
    failed: "under_examination",
    unanalysed: "under_examination",
    expired: "inactive",
}

function walk(dir: string, out: string[] = []): string[] {
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry)
        if (entry === "node_modules" || entry === ".next") continue
        if (statSync(full).isDirectory()) walk(full, out)
        else if (/\.tsx?$/.test(entry)) out.push(full)
    }
    return out
}

describe("the matrix", () => {
    for (const branch of BRANCHES) {
        for (const [state, input] of Object.entries(STATES) as Array<[keyof typeof STATES, (typeof STATES)[keyof typeof STATES]]>) {
            it(`${branch} × ${state} → ${EXPECTED[state]}, never confirmed, never reassuring`, () => {
                const r = resolveRecordStatus({ ...input, policyStatus: "active", confirmedAt: null })
                expect(r.status).toBe(EXPECTED[state])
                expect(r.status).not.toBe("confirmed")
                for (const copy of [el.recordStatus, en.recordStatus]) {
                    expect(recordStatusLabel(r, copy)).not.toMatch(REASSURANCE)
                    const need = recordNeedLine(r, copy)
                    if (need) expect(need).not.toMatch(REASSURANCE)
                }
            })
        }
    }

    it("a technical failure names the reason; a document with nothing readable needs the document", () => {
        expect(resolveRecordStatus({ lifecycleStatus: "active", latestRun: { status: "failed" }, confirmedAt: null })).toMatchObject({ status: "under_examination", need: "technical" })
        expect(resolveRecordStatus({ lifecycleStatus: "active", latestRun: { status: "failed", failureCode: "EXTRACTION_EMPTY" }, confirmedAt: null })).toMatchObject({ status: "needs_data", need: "document" })
        expect(resolveRecordStatus({ lifecycleStatus: "action_needed", latestRun: null, confirmedAt: null })).toMatchObject({ status: "needs_data", need: "document" })
    })

    it("a blocked run names what the record needs", () => {
        const cases: Array<[string, string]> = [
            ["ai_consent_missing", "consent"],
            ["free_tier_ai_locked", "plan"],
            ["insufficient_tokens", "tokens"],
            ["missing_document", "document"],
            ["forbidden", "permission"],
            ["something_new", "technical"],
        ]
        for (const [reason, need] of cases) {
            expect(resolveRecordStatus({ lifecycleStatus: "active", latestRun: { status: "blocked", blockedReason: reason }, confirmedAt: null }), reason).toMatchObject({ status: "needs_data", need })
        }
    })

    it("inactive wins over everything; a queued or running run is under examination; missing fields are named", () => {
        expect(resolveRecordStatus({ lifecycleStatus: "cancelled", latestRun: { status: "completed" }, confirmedAt: new Date() }).status).toBe("inactive")
        expect(resolveRecordStatus({ lifecycleStatus: "active", policyStatus: "deleted", latestRun: null, confirmedAt: null }).status).toBe("inactive")
        expect(resolveRecordStatus({ lifecycleStatus: "active", latestRun: { status: "running" }, confirmedAt: null }).status).toBe("under_examination")
        const withFields = resolveRecordStatus({ lifecycleStatus: "active", latestRun: { status: "completed" }, missingFields: ["a", "b"], confirmedAt: null })
        expect(withFields).toMatchObject({ status: "awaiting_confirmation", need: "fields" })
        expect(recordNeedLine(withFields, el.recordStatus)).toContain("a, b")
    })

    it("zero findings is not a status: the resolver takes no finding count at all", () => {
        const src = readFileSync("lib/wallet/record-status.ts", "utf8")
        expect(src).not.toMatch(/gapCount|findings\.length|gaps\.length|openGap/)
    })
})

describe("confirmed is unreachable until C1", () => {
    it("the resolver returns it only from the extraction envelope's confirmation — the advisor's review — with the actor declared", () => {
        expect(extractionConfirmation({ extraction: { reviewState: "confirmed", confirmedAt: "2026-09-06T10:00:00.000Z", confirmedBy: "agent" } })).toEqual({ confirmedAt: "2026-09-06T10:00:00.000Z", confirmedBy: "agent" })
        expect(extractionConfirmation({ extraction: { reviewState: "confirmed", confirmedAt: "2026-09-06T10:00:00.000Z" } }).confirmedBy, "a row confirmed before the field existed was confirmed by the only writer: an advisor").toBe("agent")
        expect(extractionConfirmation({ extraction: { reviewState: "flagged", confirmedAt: null } })).toEqual({ confirmedAt: null, confirmedBy: null })
        expect(extractionConfirmation({ extraction: { reviewState: "unconfirmed" } })).toEqual({ confirmedAt: null, confirmedBy: null })
        expect(extractionConfirmation(null)).toEqual({ confirmedAt: null, confirmedBy: null })
        const confirmed = resolveRecordStatus({ lifecycleStatus: "active", latestRun: { status: "completed" }, confirmedAt: "2026-09-06", confirmedBy: "agent" })
        expect(confirmed).toMatchObject({ status: "confirmed", confirmedBy: "agent" })
        expect(recordStatusLabel(confirmed, el.recordStatus)).toBe("Επιβεβαίωση συμβούλου")
        expect(recordStatusLabel(confirmed, en.recordStatus)).toBe("Advisor-confirmed")
        expect(resolveRecordStatus({ lifecycleStatus: "active", latestRun: { status: "completed" }, confirmedAt: "2026-09-05" }).status).toBe("confirmed")
        const callers = [...walk("app"), ...walk("components"), ...walk("lib")].filter((f) => readFileSync(f, "utf8").includes("resolveRecordStatus("))
        expect(callers.length).toBeGreaterThanOrEqual(2)
        for (const f of callers) {
            if (f.endsWith("lib/wallet/record-status.ts")) continue
            const src = readFileSync(f, "utf8")
            const calls = src.split("resolveRecordStatus(").slice(1)
            for (const call of calls) {
                // The call's argument object, up to its closing brace at the call's own indentation.
                const close = call.search(/\n\s{0,8}\}\)/)
                const body = call.slice(0, close > 0 ? close : 800)
                expect(body, `${f}: a caller derives the confirmation from the extraction envelope (extractionConfirmation), never invents it and never ignores it`).toMatch(/extractionConfirmation\(policy\.acordData\)/)
            }
        }
    })
})

describe("the label", () => {
    it("is text in ONE neutral shape for all five states, carries data-fact, and every label is distinct in both locales", () => {
        for (const copy of [el.recordStatus, en.recordStatus]) {
            const labels = RECORD_STATUSES.map((status) => recordStatusLabel({ status }, copy))
            expect(new Set(labels).size).toBe(RECORD_STATUSES.length)
            for (const label of labels) expect(label.length, label).toBeLessThanOrEqual(24)
            const classes = new Set<string>()
            for (const status of RECORD_STATUSES) {
                const { container, unmount } = render(<RecordStatusLabel result={{ status, need: null, missingFields: [] }} copy={copy} />)
                const pill = container.querySelector('[data-fact="record.status"]')!
                expect(pill.textContent).toBe(recordStatusLabel({ status }, copy))
                classes.add(pill.className)
                unmount()
            }
            expect(classes.size, "colour or shape must not vary by status").toBe(1)
        }
        expect(readFileSync("components/records/RecordStatusLabel.tsx", "utf8")).not.toMatch(/bg-(red|rose|amber|orange|green|emerald)|text-status-(danger|warning|success)/)
    })

    it("renders on the policy head (B2C) and on the agent findings card, from the server-resolved status", () => {
        expect(readFileSync("components/wallet/policy-detail/PolicyHead.tsx", "utf8")).toMatch(/<RecordStatusLabel/)
        expect(readFileSync("app/(protected)/wallet/[id]/AnalysisCard.tsx", "utf8")).toMatch(/<RecordStatusLabel/)
        expect(readFileSync("app/(protected)/wallet/[id]/page.tsx", "utf8")).toMatch(/resolveRecordStatus\(/)
        expect(readFileSync("app/(protected)/customers/[id]/policy/[policyId]/page.tsx", "utf8")).toMatch(/resolveRecordStatus\(/)
    })
})
