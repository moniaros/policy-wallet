import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { LanguageProvider } from "@/contexts/LanguageContext"
import { TranslationsProvider } from "@/contexts/TranslationsProvider"
import { CalendarClock } from "lucide-react"
import { RenewalsTimelineCard, type RenewalItem } from "@/components/dashboard/home/RenewalsTimelineCard"

const LABELS = {
    kicker: "Renewal timeline",
    policiesSuffixOne: "policy renewing soon",
    policiesSuffix: "policies",
    trackExpirationsTitle: "We track your expirations for you",
    trackExpirationsBody: "Add policies and we will remind you before every renewal.",
    addPolicy: "Add a policy",
    noExpirationsTitle: "No expirations in the next 6 months",
    noExpirationsBody: "We will alert you well before every renewal.",
}

const item = (overrides: Partial<RenewalItem> = {}): RenewalItem => ({
    id: "pol-1",
    insurerName: "Interamerican",
    icon: CalendarClock,
    titleLabel: "Motor: renewal in 24 days",
    endDateLabel: "04 Sep 2026",
    days: 24,
    premiumLabel: "€540",
    checkpointCount: 0,
    checkpointLabel: null,
    ...overrides,
})

function renderCard(items: RenewalItem[]) {
    return render(
        <LanguageProvider>
            <TranslationsProvider>
                <RenewalsTimelineCard
                    items={items}
                    hasPolicies={items.length > 0}
                    showUpgradeTeaser={false}
                    labels={LABELS}
                />
            </TranslationsProvider>
        </LanguageProvider>
    )
}

/**
 * The renewal rows lead with what the date MEANS and link to the policy's
 * renewal section. The checkpoint chip renders only when something real was
 * found — its absence claims nothing, so a zero must render no chip at all
 * rather than "0 points to check".
 */
describe("renewals timeline — checkpoints", () => {
    it("leads with the meaning and links to the renewal section", () => {
        renderCard([item()])
        expect(screen.getByText("Motor: renewal in 24 days")).toBeTruthy()
        const link = screen.getByText("Motor: renewal in 24 days").closest("a")
        expect(link?.getAttribute("href")).toBe("/wallet/pol-1#dates")
    })

    it("renders the checkpoint chip only when a real count exists", () => {
        renderCard([
            item({ id: "a", checkpointCount: 2, checkpointLabel: "2 points to check" }),
            item({ id: "b", titleLabel: "Home: renewal in 90 days", checkpointCount: 0, checkpointLabel: null }),
        ])
        expect(screen.getByText("2 points to check")).toBeTruthy()
        expect(screen.queryByText(/0 points/)).toBeNull()
    })
})

/**
 * COUNT AND NOUN AGREE, INCLUDING AT ONE.
 *
 * Found on the PRODUCTION dashboard after deploy, not by the fixture matrix:
 * «1 ασφαλιστήρια με επερχόμενη ανανέωση» — a singular count against a plural
 * noun. Every portfolio fixture happened to have two or more upcoming renewals,
 * so the one case Greek actually inflects for was the one case never rendered.
 *
 * The same slip sat in the lapse watch's detail line («και άλλα 1 λήγουν»),
 * which the fixtures also never reached at one.
 */
describe("the renewals count agrees with its noun", () => {
    const base = {
        kicker: "Renewal timeline",
        policiesSuffixOne: "policy renewing soon",
        policiesSuffix: "policies renewing soon",
        trackExpirationsTitle: "t", trackExpirationsBody: "b", addPolicy: "a",
        noExpirationsTitle: "nt", noExpirationsBody: "nb",
    }
    const row = (id: string) => ({
        id, insurerName: "Interamerican", icon: () => null as any,
        titleLabel: "Motor: renews in 44 days", endDateLabel: "06/10/2026",
        days: 44, premiumLabel: "94 €", checkpointCount: 0, checkpointLabel: null,
        policyRef: "64504715",
    })

    it("uses the singular noun for exactly one", () => {
        const { container } = render(
            <RenewalsTimelineCard items={[row("a")] as any} hasPolicies showUpgradeTeaser={false} labels={base} />
        )
        expect(container.textContent).toContain("1 policy renewing soon")
        expect(container.textContent).not.toContain("1 policies")
    })

    it("uses the plural for more than one", () => {
        const { container } = render(
            <RenewalsTimelineCard items={[row("a"), row("b")] as any} hasPolicies showUpgradeTeaser={false} labels={base} />
        )
        expect(container.textContent).toContain("2 policies renewing soon")
    })
})
