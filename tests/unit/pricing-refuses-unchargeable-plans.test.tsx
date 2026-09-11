import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { readFileSync } from "node:fs"
import path from "node:path"

import { publicCheckoutAvailability } from "@/lib/pricing/stripe-mode"
import { buildPublicPricingContent } from "@/lib/pricing/pricing-view-model"
import { buildSyntheticCatalog } from "@/lib/pricing/plan-catalog"
import { PricingCard } from "@/components/pricing/PricingCard"
import type { PublicPricingPlan } from "@/lib/pricing/public-pricing-content"

/**
 * The public pricing surface does not offer a purchase this deployment cannot
 * complete.
 *
 * CLAUDE.md's CATALOG COUPLING section carried this as a standing task —
 * «refuse to render any plan whose stripe_price_id does not resolve in LIVE
 * mode» — and the literal reading guards the wrong field: `lib/billing.ts`
 * charges through inline `price_data`, so `Plan.stripePriceId` is written back
 * FROM Stripe and never charges anything. What makes an advertised price
 * unchargeable is the MODE, and on 2026-09-10 production was serving the
 * defect: `/pricing` advertised the paid tiers with a working buy button while
 * `STRIPE_SECRET_KEY` was a test key, so a visitor could reach a sandbox
 * checkout, type a card and land on a success screen having paid nothing.
 *
 * Three things have to hold, and this guards all three:
 *
 *  (a) THE RULE. `publicCheckoutAvailability` is the one answer to «can this
 *      deployment take money», and it is deliberately not «test mode is bad» —
 *      sandbox checkout is correct in dev and preview, and false only on a
 *      production deployment.
 *  (b) THE CARD. A blocked paid plan keeps its PRICE (the price is true) and
 *      loses its BUTTON (the offer would not be). Free and contact plans are
 *      untouched: neither takes a payment, so neither can break a promise.
 *  (c) THE DOOR. `createCheckoutSession` enforces the same rule, because
 *      /account and any future upgrade surface reach checkout without passing
 *      the pricing card. A fix that only hides a button is a fix that only
 *      looks like one.
 *
 * The probe fixture is a committed offence proving (c) can still turn red.
 */

const ROOT = process.cwd()

describe("(a) can this deployment take money", () => {
    it("live mode sells, everywhere", () => {
        expect(publicCheckoutAvailability("live", "production")).toEqual({ available: true, reason: null })
        expect(publicCheckoutAvailability("live", "preview")).toEqual({ available: true, reason: null })
    })

    it("sandbox on PRODUCTION does not sell — the defect this exists for", () => {
        expect(publicCheckoutAvailability("test", "production")).toEqual({
            available: false,
            reason: "sandbox_in_production",
        })
    })

    it("sandbox off production still sells — that is what test mode is for", () => {
        expect(publicCheckoutAvailability("test", "preview").available).toBe(true)
        expect(publicCheckoutAvailability("test", "development").available).toBe(true)
        expect(publicCheckoutAvailability("test", undefined).available).toBe(true)
    })

    it("an unconfigured key sells nowhere — checkout would throw in any environment", () => {
        expect(publicCheckoutAvailability("unconfigured", undefined)).toEqual({
            available: false,
            reason: "unconfigured",
        })
        expect(publicCheckoutAvailability("unconfigured", "production").available).toBe(false)
    })
})

describe("(b) the card keeps the price and drops the offer", () => {
    const blocked = () =>
        buildPublicPricingContent(buildSyntheticCatalog(), {
            available: false,
            reason: "sandbox_in_production",
        }).policyholder.plans

    it("marks every PAID plan unbuyable", () => {
        const paid = blocked().filter((p) => p.checkoutPlanId && !p.isContactPlan)
        expect(paid.length).toBeGreaterThan(0)
        for (const plan of paid) expect(plan.checkoutUnavailableReason).toBe("sandbox_in_production")
    })

    it("leaves the free plan alone — it promises no payment", () => {
        const free = blocked().find((p) => p.key === "free")
        expect(free).toBeDefined()
        expect(free!.checkoutUnavailableReason).toBeUndefined()
    })

    it("still states the price — the price is true, the offer is not", () => {
        const plus = blocked().find((p) => p.key === "plus")
        expect(plus!.pricing.monthly.amount).toBe("€4.99")
    })

    it("when the deployment CAN charge, nothing is marked", () => {
        const plans = buildPublicPricingContent(buildSyntheticCatalog(), {
            available: true,
            reason: null,
        }).policyholder.plans
        expect(plans.every((p) => p.checkoutUnavailableReason === undefined)).toBe(true)
    })

    const cardFor = (plan: PublicPricingPlan) =>
        render(
            <PricingCard
                plan={plan}
                language="el"
                billingPeriod="monthly"
                actionLabel={{ el: "Επιλέξτε πλάνο", en: "Choose plan" }}
                onSelectPlan={() => {}}
            />
        )

    it("renders a sentence instead of a button, and keeps the amount on screen", () => {
        const plus = blocked().find((p) => p.key === "plus")!
        const { container } = cardFor(plus)
        expect(container.querySelector("button")).toBeNull()
        expect(container.querySelector('[data-checkout-unavailable="sandbox_in_production"]')).not.toBeNull()
        expect(screen.getByText("€4.99")).toBeTruthy()
        // Our problem, not the reader's: no Stripe, no keys, no modes.
        expect(container.textContent).not.toMatch(/stripe|sandbox|test mode/i)
    })

    it("renders the button when the plan is buyable", () => {
        const plans = buildPublicPricingContent(buildSyntheticCatalog(), {
            available: true,
            reason: null,
        }).policyholder.plans
        const { container } = cardFor(plans.find((p) => p.key === "plus")!)
        expect(container.querySelector("button")).not.toBeNull()
        expect(container.querySelector("[data-checkout-unavailable]")).toBeNull()
    })
})

describe("(c) the door enforces it too", () => {
    const source = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8")

    it("createCheckoutSession refuses before creating a session", () => {
        const billing = source("lib/billing.ts")
        expect(billing).toMatch(/publicCheckoutAvailability\(\)/)
        expect(billing).toMatch(/CHECKOUT_UNAVAILABLE/)
        // The refusal precedes the Stripe call it is meant to prevent.
        expect(billing.indexOf("publicCheckoutAvailability()")).toBeLessThan(
            billing.indexOf("stripe.checkout.sessions.create")
        )
    })

    it("catches a checkout path that skips the rule (probe)", () => {
        const probe = source("tests/fixtures/guard-probes/checkout-without-availability.ts.txt")
        expect(probe).toMatch(/stripe\.checkout\.sessions\.create/)
        expect(probe).not.toMatch(/publicCheckoutAvailability/)
    })
})
