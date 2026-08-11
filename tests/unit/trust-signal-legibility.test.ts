import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

const AGENT_SETTINGS = 'app/(protected)/agent/settings/AgentSettingsClient.tsx'
const settings = readFileSync(AGENT_SETTINGS, 'utf-8')

/**
 * Found by crawling ALL 42 static protected routes instead of the 12–17 I had
 * been sampling. Two sentences were dimmed below the AA floor, and both are the
 * kind of sentence that must be legible:
 *
 *   • the licence verification banner — whether a regulated intermediary's
 *     professional credentials are verified or still under review, at opacity-80
 *   • the danger-zone description — what a destructive action actually does,
 *     at text-rose-700/70, measuring 3.86:1 against 6.29 at full strength
 *
 * In both cases the dimming was applied to the explanatory line while the label
 * above it stayed strong, so the product de-emphasised the part that carries the
 * meaning. Hierarchy is what the label is for.
 *
 * The assertions are on the ABSENCE of dimming rather than on one exact class
 * string: the previous version pinned the markup, so any relayout of the page
 * failed the test without a single sentence getting harder to read.
 */
describe('trust and warning copy is not dimmed', () => {
    it('carries no opacity utility at all', () => {
        // `disabled:opacity-*` is a control state, not softened prose.
        const dimmed = [...settings.matchAll(/(?<!disabled:)\bopacity-\d+/g)].map((m) => m[0])
        expect(dimmed, `dimmed copy in ${AGENT_SETTINGS}`).toEqual([])
    })

    it('leaves no warning colour carrying an opacity suffix in light mode', () => {
        // An opacity suffix on red/rose text is always a warning being softened.
        expect(settings).not.toMatch(/(?<!dark:)text-(rose|red)-\d00\/\d+/)
    })

    it('states the licence verification result in body text, not a caption aside', () => {
        // The status line and its explanation sit together in the banner; the
        // explanation is never smaller than the design system's smallest
        // functional size.
        expect(settings).toMatch(/verifiedDescription/)
        expect(settings).not.toMatch(/text-micro[^"]*verifiedDescription/)
    })

    it('the danger zone explains itself before offering the action', () => {
        expect(settings).toMatch(/tone="danger"/)
        expect(settings).toMatch(/description=\{copy\.dangerDescription\}/)
    })
})
