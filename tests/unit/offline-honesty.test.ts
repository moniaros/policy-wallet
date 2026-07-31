/**
 * WP-19 — the offline toast must not promise data the app does not have.
 *
 * It said "You are offline. Showing saved data." / «Εμφανίζονται αποθηκευμένα
 * δεδομένα». Nothing showed saved data: `lib/services/offline-storage.ts` is a
 * complete IndexedDB layer with zero importers. A user who believed the message
 * would read whatever was on screen as their own current policy figures.
 *
 * The test is written against the CAUSE, not the wording: as long as the
 * offline store has no consumers, no user-facing string may claim cached data.
 * If someone wires the store up later, this test tells them exactly which claim
 * becomes safe to make again.
 */
import { readFileSync } from "node:fs"
import { globSync } from "glob"
import { describe, expect, it } from "vitest"

const OFFLINE_STORE = "lib/services/offline-storage.ts"

function importersOfOfflineStore(): string[] {
    const files = [
        ...globSync("app/**/*.{ts,tsx}"),
        ...globSync("components/**/*.{ts,tsx}"),
        ...globSync("lib/**/*.ts"),
    ].filter((f) => !f.endsWith("offline-storage.ts"))

    // Match real IMPORTS only. A first version matched the bare string and so
    // counted this test file and a comment in OfflineProvider as consumers —
    // measuring mentions instead of wiring, which is precisely the mistake this
    // suite exists to catch elsewhere.
    return files.filter((f) =>
        /(?:from\s*|import\s*\(\s*)["'][^"']*offline-storage["']/.test(readFileSync(f, "utf-8"))
    )
}

describe("offline messaging honesty", () => {
    it("scans a meaningful number of files", () => {
        // Vacuity floor: a broken glob would make the claim check pass by
        // finding nothing to check.
        expect(globSync("components/**/*.tsx").length).toBeGreaterThan(50)
    })

    it("does not claim cached data while the offline store has no consumers", () => {
        const wired = importersOfOfflineStore()

        // Inspect the USER-FACING copy only. Scanning the whole file also
        // matched comments that quote the old wording as historical context —
        // and a comment has never misled a user.
        const src = readFileSync("components/providers/OfflineProvider.tsx", "utf-8")
        const start = src.indexOf("const OFFLINE_COPY")
        const end = src.indexOf("} as const", start)
        expect(start, "OFFLINE_COPY block not found").toBeGreaterThan(-1)
        const copy = src.slice(start, end)

        if (wired.length === 0) {
            expect(copy).not.toMatch(/Showing saved data|Showing cached data/i)
            expect(copy).not.toMatch(/Εμφανίζονται αποθηκευμένα/)
        }
    })

    it("still tells the user their connection is gone, in both languages", () => {
        const copy = readFileSync("components/providers/OfflineProvider.tsx", "utf-8")
        expect(copy).toMatch(/Είστε εκτός σύνδεσης/)
        expect(copy).toMatch(/You are offline/)
    })

    it("documents the unused offline store rather than leaving it looking wired", () => {
        // Keeps the finding visible: the file is real, complete and dead.
        expect(readFileSync(OFFLINE_STORE, "utf-8").length).toBeGreaterThan(0)
        expect(importersOfOfflineStore()).toEqual([])
    })
})
