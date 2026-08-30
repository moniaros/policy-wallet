import { describe, it, expect } from "vitest"
import { render, screen, within } from "@testing-library/react"
import { Shell } from "@/src/design-system/shell/Shell"
import { LargeTitleNav } from "@/src/design-system/shell/LargeTitleNav"
import { PRIMARY_NAV, SECONDARY_NAV, SIDEBAR_NAV, ADD_POLICY } from "@/lib/app/navigation"
import { el } from "@/lib/i18n/translations/el"

const resolve = (e: (typeof PRIMARY_NAV)[number]) => ({ ...e, label: el.app.nav[e.labelKey] })
const labels = { primary: el.app.nav.primary, skip: el.app.nav.skip, brand: el.app.nav.brand, yourAccount: el.app.shell.yourAccount, updates: "Ενημερώσεις — 3 νέες" }

function renderShell(badge = 3) {
    return render(
        <Shell
            primary={PRIMARY_NAV.map(resolve)}
            sidebar={SIDEBAR_NAV.map(resolve)}
            updates={resolve(SECONDARY_NAV[0])}
            add={resolve(ADD_POLICY)}
            badge={badge}
            labels={labels}
            user={{ name: "Μαρία", href: "/account", planLine: "Πρόγραμμα: Family" }}
            brandHref="/dashboard"
            saturated="9+"
        >
            <p>content</p>
        </Shell>
    )
}

describe("the Grafí shell — one tree, three chromes", () => {
    it("the skip link is the first focusable element and targets the one <main>", () => {
        const { container } = renderShell()
        const first = container.querySelector("a, button")!
        expect(first.getAttribute("href")).toBe("#main-content")
        expect(container.querySelectorAll("main").length).toBe(1)
        expect(container.querySelector("main")!.id).toBe("main-content")
    })
    it("renders the five tabs, the rail and the sidebar from the same registry, each landmark named", () => {
        renderShell()
        const navs = screen.getAllByRole("navigation", { name: labels.primary })
        expect(navs.length).toBe(3)
        const tabBar = navs.find((n) => n.className.includes("tablet:hidden"))!
        expect(within(tabBar).getAllByRole("link")).toHaveLength(5)
        for (const e of PRIMARY_NAV) expect(within(tabBar).getByRole("link", { name: el.app.nav[e.labelKey] })).toBeTruthy()
    })
    it("the bell carries the unread count with the saturated form and an accessible name that says the count", () => {
        renderShell(12)
        const bells = screen.getAllByRole("link", { name: "Ενημερώσεις — 3 νέες" })
        expect(bells.length).toBeGreaterThan(0)
        expect(screen.getAllByText("9+").length).toBeGreaterThan(0)
    })
    it("hides the badge entirely at zero — no empty pill", () => {
        const { container } = renderShell(0)
        expect(container.querySelectorAll("[data-count='notification.unreadCount']").length).toBe(0)
    })
    it("every chrome control declares a 44pt-or-better target", () => {
        const { container } = renderShell()
        const controls = [...container.querySelectorAll("nav a, nav button, a[aria-label]")]
        const offenders = controls.filter((c) => !/\b(min-h-11|min-h-14|size-11|size-12|size-14|min-h-g-tabbar)\b/.test(c.className))
        expect(offenders.map((c) => c.textContent?.trim() || c.getAttribute("aria-label"))).toEqual([])
    })
    it("the add-policy action exists on every chrome (FAB, rail, sidebar)", () => {
        renderShell()
        expect(screen.getAllByRole("link", { name: el.app.nav.add }).length).toBe(3)
    })
})

describe("LargeTitleNav", () => {
    it("renders exactly one h1 and, on a sub-screen, a back control instead of the brand", () => {
        const { container } = render(<LargeTitleNav title="Ο φάκελός σας" brand={{ href: "/dashboard", label: "PolicyWallet" }} back={{ href: "/wallet", label: "Πίσω" }} />)
        expect(container.querySelectorAll("h1").length).toBe(1)
        expect(screen.getByRole("link", { name: /Πίσω/ })).toBeTruthy()
        expect(screen.queryByRole("link", { name: "PolicyWallet" })).toBeNull()
    })
    it("renders the brand mark when there is nothing to go back to", () => {
        render(<LargeTitleNav title="Η προστασία σας" brand={{ href: "/dashboard", label: "PolicyWallet" }} />)
        expect(screen.getByRole("link", { name: "PolicyWallet" })).toBeTruthy()
    })
})
