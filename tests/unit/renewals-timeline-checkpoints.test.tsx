import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { LanguageProvider } from "@/contexts/LanguageContext"
import { TranslationsProvider } from "@/contexts/TranslationsProvider"
import { CalendarClock } from "lucide-react"
import { RenewalsTimelineCard, type RenewalItem } from "@/components/dashboard/home/RenewalsTimelineCard"

const LABELS = {
    kicker: "Renewal timeline",
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
