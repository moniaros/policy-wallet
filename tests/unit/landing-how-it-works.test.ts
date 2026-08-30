import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { landingContent } from "@/lib/landing/content"
import { buildLandingJsonLd } from "@/lib/landing/seo"

/**
 * The homepage "how it works" band and its HowTo JSON-LD share one source
 * (lib/landing/content). Four things can drift apart silently:
 *
 *  - the H2 says «Τέσσερα» — a fifth (or third) step would contradict it;
 *  - `emphasis` is rendered by substring match, so a phrase that is not a
 *    verbatim substring of its description in BOTH locales renders plain
 *    with no error;
 *  - the JSON-LD must carry the plain description (no markup, no emphasis);
 *  - every step id needs an icon and an arrow target in the component —
 *    a step without a target renders no arrow, and nothing would say so.
 *
 * Universe: the steps array itself, enumerated — never a hardcoded list.
 */
const LOCALES = ["el", "en"] as const
const COMPONENT = readFileSync("components/landing/grafi/HowItWorks.tsx", "utf-8")

describe("homepage how-it-works steps", () => {
    const { steps } = landingContent.howItWorks

    it("has exactly four steps — the heading says so", () => {
        expect(steps).toHaveLength(4)
    })

    it("every emphasis phrase is a verbatim substring of its description, both locales", () => {
        for (const step of steps) {
            if (!step.emphasis) continue
            for (const locale of LOCALES) {
                expect(
                    step.description[locale],
                    `${step.id} (${locale}): emphasis «${step.emphasis[locale]}» not found in description`,
                ).toContain(step.emphasis[locale])
            }
        }
    })

    it("the HowTo JSON-LD carries the plain description of each step", () => {
        for (const locale of LOCALES) {
            const howTo = buildLandingJsonLd(locale).find(
                (node): node is { "@type": string; step: Array<{ name: string; text: string }> } =>
                    (node as { "@type"?: string })["@type"] === "HowTo",
            )
            expect(howTo).toBeDefined()
            expect(howTo!.step).toHaveLength(steps.length)
            howTo!.step.forEach((emitted, i) => {
                expect(emitted.name).toBe(steps[i].title[locale])
                expect(emitted.text).toBe(steps[i].description[locale])
                expect(emitted.text).not.toMatch(/<|>/)
            })
        }
    })

    it("every step id has an icon and an arrow target in the component", () => {
        for (const step of steps) {
            const key = `"${step.id}":`
            const occurrences = COMPONENT.split(key).length - 1
            expect(occurrences, `${step.id} needs entries in STEP_ICONS and STEP_TARGETS`).toBeGreaterThanOrEqual(2)
        }
    })
})
