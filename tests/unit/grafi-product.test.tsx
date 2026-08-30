import { describe, it, expect, vi, beforeAll } from "vitest"
import { render, screen, fireEvent, within } from "@testing-library/react"
import { VerdictCard, ActionRow, ActionRowList, TierHeader, FindingCard, MoneyTriad, CoverageMap, CoverageChecklist, ConsentSheet, Ledger, PlatformNote, HouseholdStrip, ExpiryRail } from "@/src/design-system/app"
import { toRenderableFinding, findingHash, type RenderableFinding } from "@/lib/app/finding"

vi.mock("@/lib/logger", () => ({ logger: vi.fn() }))

beforeAll(() => {
    const proto = HTMLDialogElement.prototype as unknown as { showModal?: () => void; close?: () => void }
    proto.showModal = proto.showModal ?? function (this: HTMLDialogElement) { this.setAttribute("open", "") }
    proto.close = proto.close ?? function (this: HTMLDialogElement) { this.removeAttribute("open") }
})

const tiles = [{ state: "covered" as const, label: "Καλύπτονται", count: 22, href: "/see?state=covered" }, { state: "gap" as const, label: "Με κενό", count: 5, href: "/see?state=gap" }, { state: "review" as const, label: "Για έλεγχο", count: 3, href: "/see?state=review" }]

describe("VerdictCard — counts of documents, never a score", () => {
    it("renders the count pair, a named ring, three tiles that sum to the active policies, and no percentage anywhere", () => {
        const { container } = render(<VerdictCard counts={{ covered: 22, gap: 5, review: 3 }} active={30} quiet={false} mood="Αξίζει να δείτε" sentence="Σας καλύπτουν 22 από τα 30." reassurance="Τρία πράγματα αξίζει να δείτε." ringLabel="22 από 30 καλύπτονται · 5 με κενό · 3 για έλεγχο" tiles={tiles} />)
        expect(screen.getByRole("img", { name: /22 από 30/ })).toBeTruthy()
        expect(screen.getByText("22/30")).toBeTruthy()
        expect(container.textContent).not.toMatch(/%/)
        const counts = tiles.map((t) => t.count).reduce((a, b) => a + b, 0)
        expect(counts).toBe(30)
        expect(screen.getAllByRole("link")).toHaveLength(3)
    })
    it("the quiet variant carries the §6 sentence and the covered mood", () => {
        render(<VerdictCard counts={{ covered: 3, gap: 0, review: 0 }} active={3} quiet mood="Όλα εντάξει" sentence="Δεν χρειάζεται να κάνετε τίποτα σήμερα." reassurance="Τα παρακολουθώ όλα. Η επόμενη λήξη είναι σε 37 ημέρες." ringLabel="3 από 3" tiles={tiles} />)
        expect(screen.getByRole("heading", { name: "Δεν χρειάζεται να κάνετε τίποτα σήμερα." })).toBeTruthy()
        expect(screen.getByText("Όλα εντάξει").className).toMatch(/text-state-covered/)
    })
})

describe("ActionRow / TierHeader", () => {
    it("the whole row is the link; the trailing figure or a chevron closes it", () => {
        render(<><TierHeader title="Να το δείτε τώρα" definition="Λήγει μέσα σε 14 ημέρες." count={2} /><ActionRowList label="L"><ActionRow kind="expiry" sentence="Το ΙΚΖ-4821 λήγει σε 8 ημέρες." source="Ασφαλιστήριο αυτοκινήτου · σελ. 1" trailing="8 ημ." href="/wallet/1" /></ActionRowList></>)
        const link = screen.getByRole("link", { name: /ΙΚΖ-4821/ })
        expect(link.getAttribute("href")).toBe("/wallet/1")
        expect(link.className).toMatch(/min-h-16/)
        expect(screen.getByRole("heading", { name: /Να το δείτε τώρα/ })).toBeTruthy()
        expect(screen.getByText("2")).toBeTruthy()
    })
})

const labels = { kind: "Κενό", sourceLabel: "Πού το είδα:", open: "Άνοιγμα", help: "Βοήθεια", dismiss: "Δεν με αφορά", dismissTitle: "Γιατί;", dismissConfirm: "Να μην το ξαναδώ", close: "Κλείσιμο", cancel: "Άκυρο", reasons: [{ value: "chosen" as const, label: "Το ξέρω" }, { value: "renewed" as const, label: "Το ανανέωσα" }, { value: "not_relevant" as const, label: "Δεν με αφορά" }] }
const gated = (): RenderableFinding => toRenderableFinding({ id: "f1", hash: findingHash("p1", "flood", "r"), kind: "gap", tier: "now", object: { policyId: "p1", assetLabel: "Κατοικία" }, sentence: { key: "k", params: {} }, source: { documentId: "d1", documentLabel: "Ασφαλιστήριο κατοικίας", locator: { kind: "section", section: "coverages", found: false } }, ruleId: "r" })!

describe("FindingCard — cannot render without the gate", () => {
    it("the only way to construct one is through toRenderableFinding (a rejected finding is null)", () => {
        expect(toRenderableFinding({ id: "x" })).toBeNull()
        expect(gated()).not.toBeNull()
    })
    it("renders sentence, source line and the three actions; why-you only when supplied", () => {
        const { rerender } = render(<FindingCard finding={gated()} sentence="Δεν βρήκα κάλυψη πλημμύρας." sourceLine="Ασφαλιστήριο κατοικίας · ενότητα καλύψεων — δεν αναφέρεται" openHref="/wallet/p1" helpHref="/agent/help/f1" onDismiss={() => {}} labels={labels} />)
        expect(screen.getByRole("heading", { name: "Δεν βρήκα κάλυψη πλημμύρας." })).toBeTruthy()
        expect(screen.getByText(/ενότητα καλύψεων/)).toBeTruthy()
        expect(screen.getByRole("link", { name: "Άνοιγμα" }).getAttribute("href")).toBe("/wallet/p1")
        expect(screen.getByRole("link", { name: "Βοήθεια" }).getAttribute("href")).toBe("/agent/help/f1")
        expect(screen.getByRole("button", { name: "Δεν με αφορά" })).toBeTruthy()
        expect(screen.queryByText(/Μου είπατε/)).toBeNull()
        rerender(<FindingCard finding={gated()} sentence="s" sourceLine="src" whyYou="Μου είπατε ότι το σπίτι είναι δικό σας." openHref="#" helpHref="#" labels={labels} />)
        expect(screen.getByText(/Μου είπατε/)).toBeTruthy()
        expect(screen.queryByRole("button", { name: "Δεν με αφορά" })).toBeNull()
    })
    it("dismissing asks for one of the three reasons and confirms with it", async () => {
        const onDismiss = vi.fn()
        render(<FindingCard finding={gated()} sentence="s" sourceLine="src" openHref="#" helpHref="#" onDismiss={onDismiss} labels={labels} />)
        fireEvent.click(screen.getByRole("button", { name: "Δεν με αφορά" }))
        const group = screen.getByRole("radiogroup", { name: "Γιατί;", hidden: true })
        expect(within(group).getAllByRole("radio", { hidden: true })).toHaveLength(3)
        const confirm = screen.getByRole("button", { name: "Να μην το ξαναδώ", hidden: true }) as HTMLButtonElement
        expect(confirm.disabled).toBe(true)
        fireEvent.click(within(group).getByRole("radio", { name: "Το ανανέωσα", hidden: true }))
        expect(confirm.disabled).toBe(false)
        fireEvent.click(confirm)
        await Promise.resolve()
        expect(onDismiss).toHaveBeenCalledWith("renewed")
    })
})

describe("MoneyTriad / CoverageMap / CoverageChecklist", () => {
    it("a missing figure renders an em dash and its honest note, never an invented ≈", () => {
        render(<MoneyTriad paid={{ label: "Πληρώνετε", value: "8.224 €", note: "Μόνο όσα ισχύουν.", factKey: "money.paid" }} protects={{ label: "Έως", value: null, note: "Δεν βρήκα όριο.", factKey: "money.protects" }} twice={{ label: "Δύο φορές", value: null, note: "Δεν βρήκα ίδια κάλυψη δύο φορές.", factKey: "money.twice" }} />)
        expect(screen.getAllByText("—")).toHaveLength(2)
        expect(screen.getByText("Δεν βρήκα όριο.")).toBeTruthy()
        expect(document.querySelector('[data-fact="money.paid"]')!.textContent).toBe("8.224 €")
    })
    it("every map cell carries a glyph and a label; a line you do not have says so", () => {
        render(<CoverageMap legend={{ covered: "Καλύπτεται", gap: "Κενό", review: "Για έλεγχο", none: "δεν έχετε" }} cells={[{ id: "home", label: "Κατοικία", state: "covered" }, { id: "motor", label: "Αυτοκίνητο", state: "gap" }, { id: "pet", label: "Κατοικίδιο", state: null }]} />)
        expect(screen.getByText("✓ Καλύπτεται")).toBeTruthy()
        expect(screen.getByText("◆ Κενό")).toBeTruthy()
        expect(screen.getByText("δεν έχετε")).toBeTruthy()
    })
    it("every checklist line carries a citation", () => {
        render(<CoverageChecklist stateLabels={{ ok: "Καλύπτεται", not: "Δεν καλύπτεται", review: "Δεν είμαι σίγουρος" }} lines={[{ id: "a", label: "Πυρκαγιά", state: "ok", citation: "άρθρο 2.1 · σελ. 3" }, { id: "b", label: "Πλημμύρα", state: "not", citation: "δεν αναφέρεται" }]} />)
        expect(screen.getByText("άρθρο 2.1 · σελ. 3")).toBeTruthy()
        expect(screen.getByText("δεν αναφέρεται")).toBeTruthy()
        expect(screen.getByText("Δεν καλύπτεται:", { exact: false })).toBeTruthy()
    })
})

describe("ConsentSheet — one sentence, one switch", () => {
    it("lists what will be sent as chips, renders the sentence verbatim, and keeps confirm inert until the switch is on", () => {
        const onConfirm = vi.fn()
        const { rerender } = render(<ConsentSheet open onClose={() => {}} title="Τι θα σταλεί" chips={["Το εύρημα", "Ασφαλιστήριο"]} sentence="Στέλνω μόνο αυτά." switchLabel="Συμφωνώ" checked={false} onCheckedChange={() => {}} confirm={{ label: "Αποστολή", onConfirm }} cancelLabel="Άκυρο" closeLabel="Κλείσιμο" />)
        expect(within(screen.getByRole("list", { name: "Τι θα σταλεί", hidden: true })).getAllByRole("listitem", { hidden: true })).toHaveLength(2)
        expect(document.querySelector('[data-fact="consent.sentence"]')!.textContent).toBe("Στέλνω μόνο αυτά.")
        expect(screen.getAllByRole("switch", { hidden: true })).toHaveLength(1)
        expect((screen.getByRole("button", { name: "Αποστολή", hidden: true }) as HTMLButtonElement).disabled).toBe(true)
        rerender(<ConsentSheet open onClose={() => {}} title="Τι θα σταλεί" chips={["a"]} sentence="s" switchLabel="Συμφωνώ" checked onCheckedChange={() => {}} confirm={{ label: "Αποστολή", onConfirm }} cancelLabel="Άκυρο" closeLabel="Κλείσιμο" />)
        fireEvent.click(screen.getByRole("button", { name: "Αποστολή", hidden: true }))
        expect(onConfirm).toHaveBeenCalled()
    })
})

describe("Ledger / PlatformNote / HouseholdStrip / ExpiryRail", () => {
    it("the ledger shows lines only for things that happened, otherwise the honest empty sentence", () => {
        const { rerender } = render(<Ledger title="Τι έκανα" empty="Δεν έχω ακόμη κάτι." lines={[]} />)
        expect(screen.getByText("Δεν έχω ακόμη κάτι.")).toBeTruthy()
        rerender(<Ledger title="Τι έκανα" planLine="Family · 8,99 €" empty="—" lines={[{ key: "policiesRead", label: "Διάβασα", value: "30" }]} />)
        expect(document.querySelector('[data-fact="ledger.policiesRead"]')!.textContent).toBe("30")
        expect(document.querySelector('[data-fact="ledger.plan"]')!.textContent).toBe("Family · 8,99 €")
    })
    it("the note is a named note region in the product's voice", () => {
        render(<PlatformNote title="Σημείωση" body="Ό,τι σας λέω το διάβασα με AI." />)
        expect(screen.getByRole("note", { name: "Σημείωση" }).textContent).toContain("AI")
    })
    it("household cards and expiry cards are whole-card links with a state chip", () => {
        render(<><HouseholdStrip stateLabels={{ covered: "Καλύπτεται", gap: "Κενό", review: "Για έλεγχο" }} add={{ href: "/me/household", label: "Προσθήκη" }} people={[{ id: "a", name: "Μαρία", state: "review", countLabel: "χωρίς ασφαλιστήριο", href: "/me/household/a" }]} /><ExpiryRail label="Λήξεις" stateLabels={{ covered: "Καλύπτεται", gap: "Κενό", review: "Για έλεγχο" }} items={[{ id: "1", label: "ΙΚΖ-4821", when: "σε 8 ημέρες", state: "gap", href: "/wallet/1" }]} /></>)
        expect(screen.getByRole("link", { name: /Μαρία/ }).getAttribute("href")).toBe("/me/household/a")
        expect(screen.getByRole("link", { name: /Προσθήκη/ })).toBeTruthy()
        expect(screen.getByRole("list", { name: "Λήξεις" }).className).toMatch(/pw-scroll-strip/)
    })
})
