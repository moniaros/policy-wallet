import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

const settings = readFileSync('app/(protected)/agent/settings/AgentSettingsClient.tsx', 'utf-8')

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
 */
describe('trust and warning copy is not dimmed', () => {
    it('states the licence verification result at full strength', () => {
        expect(settings).not.toMatch(/text-xs opacity-80 font-medium/)
        expect(settings).toMatch(/<p className="text-xs font-medium mt-0\.5">/)
    })

    it('states what a destructive action does at full strength', () => {
        expect(settings).not.toMatch(/text-rose-700\/70/)
        expect(settings).toMatch(/text-sm text-rose-700 dark:text-rose-400 mb-6 font-medium/)
    })

    it('leaves no warning colour carrying an opacity suffix in light mode', () => {
        // An opacity suffix on red/rose text is always a warning being softened.
        const src = readFileSync('app/(protected)/agent/settings/AgentSettingsClient.tsx', 'utf-8')
        expect(src).not.toMatch(/(?<!dark:)text-(rose|red)-\d00\/\d+/)
    })
})
