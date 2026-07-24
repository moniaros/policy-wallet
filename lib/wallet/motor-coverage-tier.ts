/**
 * What level of motor cover a policy actually carries.
 *
 * `vehicle.coverageTier` is free text from the extraction — the schema's own
 * examples are "third-party, third-party-fire-theft, comprehensive". The panel
 * printed it verbatim (`.replace(/_/g, " ")` + CSS capitalize), which meant a
 * Greek policyholder read "Third-party-fire-theft" in English on the single
 * most consequential field in their motor policy — and the underscore replace
 * never fired, because the schema's examples are hyphenated.
 *
 * el.ts has carried «Τρίτων», «Τρίτων, Πυρός & Κλοπής» and «Μικτή» since the
 * panel was written. Nothing ever used them.
 *
 * Classification is deliberately conservative. An unrecognised string returns
 * null and the caller shows it verbatim: displaying an insurer's own wording is
 * honest, whereas guessing a tier from a phrase we do not recognise would put
 * "Μικτή" in front of someone who is only insured for third-party liability.
 */
export type MotorCoverageTier = "third_party" | "third_party_fire_theft" | "comprehensive"

/**
 * No \b anywhere: JavaScript word boundaries are ASCII-only, so `\bμικτ\b`
 * matches nothing at all in Greek.
 */
export function classifyMotorCoverageTier(raw: string | null | undefined): MotorCoverageTier | null {
    const s = String(raw || "").toLowerCase().trim()
    if (!s) return null

    // Comprehensive first — «μικτή»/«μεικτή» are both current in the Greek
    // market, and a comprehensive policy also names fire and theft, so testing
    // the narrower tiers first would misclassify it downward.
    if (s.includes("comprehensive") || s.includes("μικτ") || s.includes("μεικτ")) return "comprehensive"

    const isThirdParty =
        s.includes("third") ||
        s.includes("liability") ||
        s.includes("τρίτ") ||
        s.includes("τριτ") ||
        s.includes("αστική ευθύνη") ||
        s.includes("αστικη ευθυνη")
    if (!isThirdParty) return null

    const addsFireOrTheft =
        s.includes("fire") || s.includes("theft") || s.includes("πυρ") || s.includes("κλοπ")
    return addsFireOrTheft ? "third_party_fire_theft" : "third_party"
}

/**
 * Whether this tier covers damage to the holder's OWN vehicle.
 *
 * Drives presentation: the tier sat in an affirmative green pill whatever it
 * said, so «Τρίτων» — the legal minimum, which pays nothing towards your own
 * car — was styled exactly like full cover. Only comprehensive earns the
 * affirmative treatment; the rest are stated neutrally, not as a warning.
 */
export function tierCoversOwnVehicle(tier: MotorCoverageTier | null): boolean {
    return tier === "comprehensive"
}
