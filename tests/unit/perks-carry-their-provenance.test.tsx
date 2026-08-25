import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import { readFileSync } from "node:fs"
import { PerksCard } from "@/components/wallet/policy-detail/PerksCard"

/**
 * A perk is a CLAIM about someone's contract, so it says where it came from.
 *
 * P-08. The card told a customer they have free roadside assistance and carried
 * no clause reference, no document link — the only links on it were the perk's
 * own `tel:` and website. That is the shape this whole run keeps finding: an
 * assertion with no traceable basis.
 *
 * `PolicyPerk` has no clause field in the ACORD schema, so document-level is the
 * honest granularity available — the same answer `unreadable-value.ts` gives
 * when it cannot read a field: point at the document, which is where the truth
 * is. When there is no stored document the card SAYS so rather than linking
 * nowhere, because a dead link is worse than an admission.
 */
const COPY = {
    perksTitle: "Perks",
    perksSubtitle: "",
    usageLimitLabel: "Limit",
    callServiceCta: "Call",
    visitSiteCta: "Visit",
    dontForgetChip: "Don't forget",
    noPerksDetected: "No perks",
    exclusionsReanalyzeHint: "",
    perksSourceLink: "See where these appear in your policy",
    perksSourceMissing: "These come from your policy, but we have no stored document to show you.",
    perkTypes: { assistance: "Assistance" },
}
const PERK = {
    perkType: "assistance",
    name: { el: "Οδική βοήθεια", en: "Roadside assistance" },
    description: { el: "Δωρεάν οδική βοήθεια", en: "Free roadside assistance" },
    expiresWithPolicy: true,
    reminderRecommended: false,
} as never

describe("a perk points at the document it was read from", () => {
    it("links to the source document when there is one", () => {
        const href = "/api/v1/policies/p1/documents/d1"
        const { container } = render(<PerksCard perks={[PERK]} lang="en" copy={COPY} sourceDocumentHref={href} />)
        const link = [...container.querySelectorAll("a")].find((a) => a.getAttribute("href") === href)
        expect(link, "no link to the source document").toBeTruthy()
        expect(link!.textContent).toContain(COPY.perksSourceLink)
    })

    it("says there is no document rather than linking nowhere", () => {
        const { container } = render(<PerksCard perks={[PERK]} lang="en" copy={COPY} sourceDocumentHref={null} />)
        expect(container.textContent).toContain(COPY.perksSourceMissing)
        // No empty or placeholder href.
        for (const a of container.querySelectorAll("a")) {
            const h = a.getAttribute("href") ?? ""
            expect(h === "" || h === "#").toBe(false)
        }
    })

    it("says nothing when there are no perks to attribute", () => {
        const { container } = render(<PerksCard perks={[]} lang="en" copy={COPY} sourceDocumentHref="/doc" />)
        expect(container.textContent).not.toContain(COPY.perksSourceLink)
        expect(container.textContent).not.toContain(COPY.perksSourceMissing)
    })

    it("the provenance control clears the 44px floor", () => {
        const { container } = render(<PerksCard perks={[PERK]} lang="en" copy={COPY} sourceDocumentHref="/doc" />)
        const link = [...container.querySelectorAll("a")].find((a) => a.textContent?.includes(COPY.perksSourceLink))
        expect(link!.className).toMatch(/\bmin-h-11\b/)
    })
})

/**
 * The seam, not just the component.
 *
 * Probing the guard above found the hole it could not see: the component tests
 * pass a real href themselves, so wiring `sourceDocumentHref={null}` at the call
 * site would satisfy every one of them while shipping a card that never links to
 * anything. That is the same seam failure as D-027 — both halves tested, the
 * wiring between them untested.
 */
describe("the call site passes a real document href, not null", () => {
    const view = readFileSync("components/wallet/PolicyDetailsClientView.tsx", "utf-8")

    it("mounts PerksCard with the page's own document href", () => {
        // The mount carries a large `copy={{…}}` block, so take a generous
        // window from the tag rather than trying to match to its close.
        const at = view.indexOf("<PerksCard")
        const mount = at >= 0 ? view.slice(at, at + 2000) : ""
        expect(mount, "PerksCard mount not found — did it move?").toContain("PerksCard")
        expect(mount).toMatch(/sourceDocumentHref=\{firstDocumentHref\}/)
        expect(
            /sourceDocumentHref=\{null\}/.test(mount),
            "the call site hardcodes null — the card would never link to anything"
        ).toBe(false)
    })

    it("that href is still derived from the policy's stored document", () => {
        // Non-vacuity: `firstDocumentHref` must still be computed from a real
        // document id, not left as a stale identifier pointing nowhere.
        expect(view).toMatch(/firstDocumentId\s*=\s*policy\.documents/)
        expect(view).toMatch(/firstDocumentHref\s*=/)
    })
})
