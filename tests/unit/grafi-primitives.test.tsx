import { describe, it, expect, vi, beforeAll } from "vitest"
import { render, screen, fireEvent, within } from "@testing-library/react"
import { Button, IconButton, FilterChip, SearchField, Badge, Avatar } from "@/src/design-system/primitives"
import { Switch } from "@/src/design-system/switch"
import { SegmentedControl } from "@/src/design-system/segmented-control"
import { Sheet } from "@/src/design-system/sheet"
import { Tooltip } from "@/src/design-system/tooltip"
import { GroupedList, GroupHeader, Row } from "@/src/design-system/app-layout"

beforeAll(() => {
    // jsdom has no <dialog> methods; the component calls them guardedly.
    const proto = HTMLDialogElement.prototype as unknown as { showModal?: () => void; close?: () => void }
    proto.showModal = proto.showModal ?? function (this: HTMLDialogElement) { this.setAttribute("open", "") }
    proto.close = proto.close ?? function (this: HTMLDialogElement) { this.removeAttribute("open") }
})

describe("Button family", () => {
    it("danger is an action variant on the danger role, not a status colour", () => {
        render(<Button variant="danger">Διαγραφή</Button>)
        expect(screen.getByRole("button", { name: "Διαγραφή" }).className).toMatch(/bg-action-danger/)
    })
    it("IconButton requires a name and renders it as the accessible name", () => {
        render(<IconButton label="Κλείσιμο"><span aria-hidden>×</span></IconButton>)
        const b = screen.getByRole("button", { name: "Κλείσιμο" })
        expect(b.className).toMatch(/size-12/)
    })
    it("FilterChip carries its state in aria-pressed", () => {
        const { rerender } = render(<FilterChip pressed={false}>Αυτοκίνητο</FilterChip>)
        expect(screen.getByRole("button", { name: "Αυτοκίνητο" }).getAttribute("aria-pressed")).toBe("false")
        rerender(<FilterChip pressed>Αυτοκίνητο</FilterChip>)
        expect(screen.getByRole("button", { name: /Αυτοκίνητο/ }).getAttribute("aria-pressed")).toBe("true")
    })
})

describe("SearchField, Badge, Avatar", () => {
    it("the search field is labelled and sits at the 16px iOS floor", () => {
        render(<SearchField label="Αναζήτηση" />)
        const input = screen.getByRole("searchbox", { name: "Αναζήτηση" })
        expect(input.className).toMatch(/text-\[16px\]/)
    })
    it("a badge on a state tone uses that state's fill", () => {
        render(<Badge tone="gap">5</Badge>)
        expect(screen.getByText("5").className).toMatch(/bg-state-gap-fill/)
    })
    it("an avatar without a photo is an image named by the person", () => {
        render(<Avatar name="Μαρία" />)
        expect(screen.getByRole("img", { name: "Μαρία" }).textContent).toBe("Μ")
    })
})

describe("Switch", () => {
    it("is a switch with aria-checked, labelled and described, and toggles", () => {
        const onChange = vi.fn()
        render(<Switch checked={false} onCheckedChange={onChange} label="Κοινή πρόσβαση" description="Ανακαλέσιμη" />)
        const sw = screen.getByRole("switch", { name: "Κοινή πρόσβαση" })
        expect(sw.getAttribute("aria-checked")).toBe("false")
        expect(sw.getAttribute("aria-describedby")).toBeTruthy()
        fireEvent.click(sw)
        expect(onChange).toHaveBeenCalledWith(true)
    })
    it("pending blocks re-entry and announces busy; disabled blocks", () => {
        render(<Switch checked onCheckedChange={() => {}} label="A" pending />)
        const sw = screen.getByRole("switch", { name: "A" }) as HTMLButtonElement
        expect(sw.disabled).toBe(true)
        expect(sw.getAttribute("aria-busy")).toBe("true")
    })
})

describe("SegmentedControl", () => {
    it("is a radiogroup with one tab stop and arrow-key movement", () => {
        const onChange = vi.fn()
        render(<SegmentedControl label="Ταξινόμηση" value="a" onChange={onChange} options={[{ value: "a", label: "Α" }, { value: "b", label: "Β" }, { value: "c", label: "Γ" }]} />)
        const group = screen.getByRole("radiogroup", { name: "Ταξινόμηση" })
        const radios = within(group).getAllByRole("radio")
        expect(radios.map((r) => r.getAttribute("aria-checked"))).toEqual(["true", "false", "false"])
        expect(radios.map((r) => r.tabIndex)).toEqual([0, -1, -1])
        fireEvent.keyDown(radios[0], { key: "ArrowRight" })
        expect(onChange).toHaveBeenCalledWith("b")
        fireEvent.keyDown(radios[0], { key: "ArrowLeft" })
        expect(onChange).toHaveBeenCalledWith("c")
    })
})

describe("Sheet", () => {
    it("is a labelled dialog that reports close on the close button and on cancel", () => {
        const onClose = vi.fn()
        render(<Sheet open onClose={onClose} title="Τι θα σταλεί" closeLabel="Κλείσιμο"><p>x</p></Sheet>)
        const dialog = screen.getByRole("dialog", { hidden: true })
        expect(dialog.getAttribute("aria-labelledby")).toBe(screen.getByText("Τι θα σταλεί").id)
        fireEvent.click(screen.getByRole("button", { name: "Κλείσιμο", hidden: true }))
        expect(onClose).toHaveBeenCalledTimes(1)
        fireEvent(dialog, new Event("cancel", { bubbles: true, cancelable: true }))
        expect(onClose).toHaveBeenCalledTimes(2)
    })
    it("carries the bottom-sheet and centred-modal geometry on the two breakpoints", () => {
        render(<Sheet open onClose={() => {}} title="T" closeLabel="C"><p>x</p></Sheet>)
        const cls = screen.getByRole("dialog", { hidden: true }).className
        expect(cls).toMatch(/bottom-0/)
        expect(cls).toMatch(/tablet:-translate-y-1\/2/)
        expect(cls).toMatch(/g-sheet-present/)
    })
})

describe("Tooltip", () => {
    it("wires aria-describedby to a tooltip element and hides it below fine-pointer", () => {
        render(<Tooltip text="Λήγει σε 8 ημέρες"><button>i</button></Tooltip>)
        const tip = screen.getByRole("tooltip", { hidden: true })
        expect(tip.textContent).toBe("Λήγει σε 8 ημέρες")
        expect(tip.className).toMatch(/hidden/)
        expect(tip.className).toMatch(/pointer:fine/)
    })
})

describe("GroupedList and Row — whole-row targets", () => {
    it("a row with href is one link, a row with onClick is one button, a static row is neither", () => {
        const onClick = vi.fn()
        render(
            <>
                <GroupHeader count={3}>Αυτοκίνητο</GroupHeader>
                <GroupedList label="ΔΕΙΓΜΑ">
                    <Row primary="Toyota Yaris · ΙΚΖ-4821" secondary="Interamerican" href="/wallet/1" />
                    <Row primary="Κατοικία" onClick={onClick} />
                    <Row primary="Στατική" />
                </GroupedList>
            </>
        )
        const list = screen.getByRole("list", { name: "ΔΕΙΓΜΑ" })
        expect(within(list).getAllByRole("listitem")).toHaveLength(3)
        const link = within(list).getByRole("link", { name: /Toyota Yaris/ })
        expect(link.className).toMatch(/min-h-16/)
        fireEvent.click(within(list).getByRole("button", { name: /Κατοικία/ }))
        expect(onClick).toHaveBeenCalled()
        expect(within(list).queryByRole("button", { name: /Στατική/ })).toBeNull()
        expect(screen.getByText("Αυτοκίνητο").parentElement!.className).not.toMatch(/uppercase/)
    })
})
