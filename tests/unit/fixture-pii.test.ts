/**
 * No real person's data in tracked test material.
 *
 * `docs/policies/*.pdf` is gitignored — someone deliberately kept real customer
 * policy documents out of the repository. But the EXTRACTED contents of one had
 * been committed in `tests/fixtures/health-ethniki-1.ts`: a real policyholder's
 * first name, surname, email address and policy number, from a real Εθνική
 * health policy. A test asserted them under the title "carries correct
 * policyholder PII", so they were pinned rather than overlooked.
 *
 * That is health-insurance data about an identifiable person, in a git
 * repository — which means every clone, every CI runner and the entire history.
 * The gitignore expressed the right intent and the fixture defeated it.
 *
 * A fixture needs the SHAPE and the numbers: field mapping, date formats,
 * premium arithmetic, confidence metadata. None of that needs a real identity.
 * This scans tracked fixtures for the two things that make data personal — a
 * routable email address and a real-person mailbox domain — so the next fixture
 * cannot reintroduce it quietly.
 *
 * Scope note: this fixes the tree, not the history. Values committed earlier
 * remain in previous commits, and removing them from history is a repository
 * operation with its own consequences — an owner decision, recorded in
 * docs/STATUS.md rather than performed here.
 */
import { readFileSync } from "node:fs"
import { globSync } from "glob"
import { describe, expect, it } from "vitest"

const FIXTURE_FILES = [
    ...globSync("tests/fixtures/**/*.{ts,json}"),
    ...globSync("prisma/seed.ts"),
]

/** Domains that exist to be used in examples and reach nobody. */
const SAFE_DOMAINS = [
    "example.com",
    "example.org",
    "example.net",
    "policywallet.gr",
    "test.local",
    "localhost",
]

const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/g

function realLookingEmails(source: string): string[] {
    return [...(source.match(EMAIL) ?? [])].filter(
        (address) => !SAFE_DOMAINS.some((domain) => address.toLowerCase().endsWith(`@${domain}`) || address.toLowerCase().endsWith(`.${domain}`))
    )
}

describe("tracked fixtures carry no real identities", () => {
    it("finds fixture files to scan", () => {
        // Vacuity floor: a moved fixture directory would make this pass by
        // scanning nothing, which is exactly how the original slipped through.
        expect(FIXTURE_FILES.length).toBeGreaterThan(0)
        expect(FIXTURE_FILES.some((f) => f.includes("health-ethniki"))).toBe(true)
    })

    it("uses only example domains for email addresses", () => {
        const offenders: string[] = []
        for (const file of FIXTURE_FILES) {
            for (const address of realLookingEmails(readFileSync(file, "utf-8"))) {
                offenders.push(`${file}: ${address}`)
            }
        }

        expect(
            offenders,
            "A routable email address in a tracked fixture is one real person's " +
            "data in every clone and every CI log. Use @example.com."
        ).toEqual([])
    })

    it("keeps the known real identity out of the tree", () => {
        // Named explicitly so a revert, a merge, or a copied fixture cannot
        // bring it back silently. The strings are split so this guard does not
        // itself become the thing it is guarding against.
        const needles = ["ΚΟΚΚΑΛ" + "ΙΑ", "ΑΡΤΕΜ" + "ΙΣ", "artemis" + "kohas", "165" + "1622"]
        const tracked = [
            ...globSync("tests/**/*.{ts,tsx}"),
            ...globSync("lib/**/*.ts"),
            ...globSync("prisma/*.ts"),
        ]

        const offenders: string[] = []
        for (const file of tracked) {
            if (file.endsWith("fixture-pii.test.ts")) continue
            const src = readFileSync(file, "utf-8")
            for (const needle of needles) {
                if (src.includes(needle)) offenders.push(`${file}: ${needle}`)
            }
        }

        expect(offenders).toEqual([])
    })
})
