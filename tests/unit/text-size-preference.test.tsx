/**
 * WP-21 — a reading size the reader controls.
 *
 * The product's decision content — what a policy covers, what it excludes, what
 * a gap means — is largely `text-sm` (14px) and `text-xs` (12px), below what
 * this kind of reading wants, and the people it fails hardest are the ones this
 * product is for: policyholders in their sixties and seventies reading an
 * exclusion clause on a phone.
 *
 * Browser zoom exists and satisfies WCAG 1.4.4. This is for the far larger
 * group who do not know it exists and would not think to look — which means the
 * control only counts if it is IN the product, in their language, and if it
 * survives a reload.
 *
 * Three things decide whether it works in practice, and each is pinned here:
 * the preference applies before first paint (a flash of the default size is
 * worst for exactly the person who set it), an unrecognised stored value never
 * reaches the DOM, and a browser that refuses localStorage does not take the
 * settings page down with it.
 */
import { readFileSync } from "node:fs"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, act } from "@testing-library/react"
import {
    DEFAULT_TEXT_SIZE,
    TEXT_SIZES,
    TEXT_SIZE_ATTRIBUTE,
    TEXT_SIZE_STORAGE_KEY,
    normalizeTextSize,
    rootFontSizeFor,
    textSizeBootstrapScript,
} from "@/lib/a11y/text-size"
import { TextSizeProvider, useTextSize } from "@/contexts/TextSizeContext"

beforeEach(() => {
    document.documentElement.removeAttribute(TEXT_SIZE_ATTRIBUTE)
    window.localStorage.clear()
})

/** Runs the layout's inline script exactly as the browser would. */
function runBootstrap() {
    new Function(textSizeBootstrapScript())()
}

describe("the size steps themselves", () => {
    it("offers more than one size", () => {
        // Vacuity floor: a single-entry list would make every check below pass
        // while offering the reader nothing.
        expect(TEXT_SIZES.length).toBeGreaterThan(2)
        expect(TEXT_SIZES).toContain(DEFAULT_TEXT_SIZE)
    })

    it("scales in percentages so a raised browser default is multiplied, not overruled", () => {
        // A reader who already enlarged their browser's base font has done the
        // hardest part; a fixed px root would silently undo it.
        for (const size of TEXT_SIZES) {
            expect(rootFontSizeFor(size)).toMatch(/%$/)
        }
        expect(rootFontSizeFor("default")).toBe("100%")
    })

    it("actually gets bigger at each step", () => {
        const percent = (s: (typeof TEXT_SIZES)[number]) => parseFloat(rootFontSizeFor(s))

        expect(percent("large")).toBeGreaterThan(percent("default"))
        expect(percent("larger")).toBeGreaterThan(percent("large"))
    })

    it("treats anything unrecognised as the default", () => {
        for (const junk of ["huge", "", null, undefined, 3, {}]) {
            expect(normalizeTextSize(junk)).toBe(DEFAULT_TEXT_SIZE)
        }
    })
})

describe("the preference is applied before first paint", () => {
    it("sizes the document from storage on load", () => {
        window.localStorage.setItem(TEXT_SIZE_STORAGE_KEY, "larger")
        runBootstrap()

        expect(document.documentElement.getAttribute(TEXT_SIZE_ATTRIBUTE)).toBe("larger")
    })

    it("leaves the document alone when nothing is stored", () => {
        runBootstrap()

        expect(document.documentElement.hasAttribute(TEXT_SIZE_ATTRIBUTE)).toBe(false)
    })

    it("ignores a hand-edited or stale stored value", () => {
        // The attribute drives a CSS selector; letting arbitrary strings through
        // would put unvalidated storage content into the DOM.
        window.localStorage.setItem(TEXT_SIZE_STORAGE_KEY, "gigantic")
        runBootstrap()

        expect(document.documentElement.hasAttribute(TEXT_SIZE_ATTRIBUTE)).toBe(false)
    })

    it("survives storage being unavailable", () => {
        const getItem = vi
            .spyOn(Storage.prototype, "getItem")
            .mockImplementation(() => {
                throw new Error("SecurityError: storage disabled")
            })

        expect(() => runBootstrap()).not.toThrow()
        getItem.mockRestore()
    })
})

describe("setting the attribute actually changes the size", () => {
    // Without this the whole feature can pass every test above and still do
    // nothing: the attribute lands on <html>, no rule matches it, and the page
    // renders identically. jsdom does not apply the stylesheet, so the binding
    // between the module's steps and the CSS is checked at the source.
    const CSS = readFileSync("app/globals.css", "utf-8")
    const LAYOUT = readFileSync("app/layout.tsx", "utf-8")

    it("has a root rule for every non-default size, at the documented scale", () => {
        const nonDefault = TEXT_SIZES.filter((s) => s !== DEFAULT_TEXT_SIZE)
        expect(nonDefault.length).toBeGreaterThan(0) // vacuity floor

        for (const size of nonDefault) {
            const rule = CSS.split(`:root[${TEXT_SIZE_ATTRIBUTE}="${size}"]`)[1]
            expect(rule, `no CSS rule for ${size}`).toBeDefined()
            expect(rule.split("}")[0]).toContain(`font-size: ${rootFontSizeFor(size)}`)
        }
    })

    it("keeps the rules unlayered so utilities cannot outrank them", () => {
        // The same cascade trap the mobile control floor below it documents:
        // a rule inside @layer base loses to any Tailwind utility.
        const index = CSS.indexOf(`:root[${TEXT_SIZE_ATTRIBUTE}=`)
        const before = CSS.slice(0, index)
        const opened = (before.match(/@layer\s+\w+\s*\{/g) ?? []).length
        const closedAtTopLevel = (before.match(/\n\}/g) ?? []).length

        expect(opened).toBeLessThanOrEqual(closedAtTopLevel)
    })

    it("is applied by a blocking script in the document head", () => {
        // A React effect would paint at the default size and then jump, which is
        // worst for the person who needs the larger size to read the flash.
        expect(LAYOUT).toContain("textSizeBootstrapScript()")
        expect(LAYOUT.split("</head>")[0]).toContain("textSizeBootstrapScript()")
    })

    it("mounts the provider so the control has somewhere to write", () => {
        expect(LAYOUT).toContain("<TextSizeProvider>")
        expect(LAYOUT).toContain("</TextSizeProvider>")
    })
})

function Harness() {
    const { textSize, setTextSize } = useTextSize()
    return (
        <div>
            <span data-testid="current">{textSize}</span>
            {TEXT_SIZES.map((size) => (
                <button key={size} onClick={() => setTextSize(size)}>
                    {size}
                </button>
            ))}
        </div>
    )
}

describe("changing the preference", () => {
    it("reads back the size the bootstrap script already applied", () => {
        // Not a second read of localStorage: one source of truth for "what size
        // is this page at", so the control cannot disagree with the page.
        document.documentElement.setAttribute(TEXT_SIZE_ATTRIBUTE, "large")
        render(
            <TextSizeProvider>
                <Harness />
            </TextSizeProvider>
        )

        expect(screen.getByTestId("current").textContent).toBe("large")
    })

    it("applies and persists a new choice", () => {
        render(
            <TextSizeProvider>
                <Harness />
            </TextSizeProvider>
        )

        act(() => screen.getByText("larger").click())

        expect(document.documentElement.getAttribute(TEXT_SIZE_ATTRIBUTE)).toBe("larger")
        expect(window.localStorage.getItem(TEXT_SIZE_STORAGE_KEY)).toBe("larger")
        expect(screen.getByTestId("current").textContent).toBe("larger")
    })

    it("clears the attribute when returning to the default", () => {
        // Rather than writing data-text-size="default", which would leave a
        // selector matching nothing and read as a bug to the next person.
        document.documentElement.setAttribute(TEXT_SIZE_ATTRIBUTE, "large")
        render(
            <TextSizeProvider>
                <Harness />
            </TextSizeProvider>
        )

        act(() => screen.getByText("default").click())

        expect(document.documentElement.hasAttribute(TEXT_SIZE_ATTRIBUTE)).toBe(false)
        expect(window.localStorage.getItem(TEXT_SIZE_STORAGE_KEY)).toBe("default")
    })

    it("still changes the size when storage refuses the write", () => {
        // Private browsing throws on setItem. Losing the preference at the next
        // reload is a small cost; a settings page that throws on click is not.
        const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
            throw new Error("QuotaExceededError")
        })
        render(
            <TextSizeProvider>
                <Harness />
            </TextSizeProvider>
        )

        expect(() => act(() => screen.getByText("large").click())).not.toThrow()
        expect(document.documentElement.getAttribute(TEXT_SIZE_ATTRIBUTE)).toBe("large")
        setItem.mockRestore()
    })

    it("works outside a provider instead of throwing", () => {
        // A component rendered in isolation — or in a test — should degrade to
        // the default rather than crash the tree it is in.
        render(<Harness />)

        expect(screen.getByTestId("current").textContent).toBe(DEFAULT_TEXT_SIZE)
    })
})
