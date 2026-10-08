/**
 * A marketing product sample renders no headings (SEO review 2026-10 S4).
 *
 * The homepage samples reuse the REAL app components, whose card titles are
 * h2s. On the public page that put «Χρειάζεται την προσοχή σας», «Επισκόπηση»
 * and «Χάρτης κάλυψης» into the document outline — 5 of the homepage's 14 H2s —
 * where crawlers and answer engines read them as page content. The samples
 * pass `headingAs="p"`.
 *
 * Universe: every exported `*Screen` of the samples module, enumerated at
 * runtime, so a new sample screen is covered the day it is added.
 */
import React from "react"
import { render, cleanup } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import * as Samples from "@/components/landing/real-screens/RealScreens"
import { ProtectionStatusHero } from "@/components/dashboard/home/ProtectionStatusHero"

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }), usePathname: () => "/" }))
afterEach(cleanup)

const HEADINGS = "h1,h2,h3,h4,h5,h6"
const screens = Object.entries(Samples).filter(
    ([name, value]) => /Screen$/.test(name) && name !== "AppScreen" && typeof value === "function"
) as Array<[string, React.ComponentType<{ locale: "el" | "en" }>]>

describe("marketing samples keep app headings out of the public outline", () => {
    it("enumerates the sample screens", () => {
        expect(screens.map(([n]) => n)).toEqual(expect.arrayContaining(["DashboardScreen", "WalletScreen", "CoverageMapScreen"]))
    })

    it("probe: the app component, rendered as the app renders it, does emit a heading", () => {
        const { container } = render(
            <ProtectionStatusHero
                hasPolicies={false}
                facts={[]}
                areasLine={null}
                openRecommendationCount={0}
                language="el"
                labels={{ kicker: "k", emptyTitle: "t", emptyBody: "b", emptyCta: "c" }}
            />
        )
        expect(container.querySelectorAll(HEADINGS).length).toBeGreaterThan(0)
    })

    for (const [name, Screen] of screens) {
        it(`${name} renders no h1–h6`, () => {
            // Inside AppScreen, exactly as the page renders it (it supplies the providers).
            const { container } = render(<Samples.AppScreen locale="el"><Screen locale="el" /></Samples.AppScreen>)
            const found = [...container.querySelectorAll(HEADINGS)].map((h) => `${h.tagName}: ${h.textContent}`)
            expect(found).toEqual([])
        })
    }
})
