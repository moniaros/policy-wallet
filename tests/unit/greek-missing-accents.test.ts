import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

/**
 * Every multi-syllable Greek word carries exactly one accent (tonos). A 5+ letter
 * mixed-case Greek word with NO accent is almost always a typo — «Διαγραφη
 * λογαριασμου» shipped that way on the settings page (fixed in d89e044), and no
 * casing/i18n guard catches it. This locks the class closed.
 *
 * Exemptions: ALL-CAPS labels (ΕΝΕΡΓΟ, ΛΗΓΜΕΝΟ) omit accents by convention, and
 * the interrogative «ποιος» family (ποιος/ποια/ποιο/ποιοι/ποιες/ποιον/ποιων) is
 * written without tonos in monotonic Greek.
 */
// Greek-letter range (skips ·, unassigned slots); includes accented forms.
const GREEK_WORD = /[ΆΈ-ΊΌΎ-ΡΣ-ώ]+/g
const ACCENTED = /[άέήίόύώΐΰϊϋΆΈΉΊΌΎΏ]/
const isAllUpper = (w: string) => /^[Α-ΩΆΈ-ΊΌΎ-Ώ]+$/.test(w)

const EXEMPT = new Set([
    'ποιος', 'ποια', 'ποιο', 'ποιοι', 'ποιες', 'ποιον', 'ποιων',
    // Contracted preposition + article — «σε»+«τους»; no tonos in monotonic Greek.
    'στους',
])

const FILES = [
    'lib/i18n/translations/el.ts',
    'components/coverage/CoverageInsightsClient.tsx',
    'app/onboarding/ProtectionProfileFlow.tsx',
    'components/onboarding/protection-profile/QuestionScreen.tsx',
    'components/onboarding/protection-profile/SummaryScreen.tsx',
    'components/onboarding/protection-profile/ProtectionMapCard.tsx',
    'components/onboarding/protection-profile/UploadScreen.tsx',
    'components/onboarding/protection-profile/AdvisorScreen.tsx',
    // The attention surfaces (personal risk profile, wave 2b) — dictionary-
    // driven, so any Greek literal here is a regression of the register.
    'components/protection/AttentionAreasCard.tsx',
    'components/protection/UnknownFactorsCard.tsx',
    'components/protection/AreaDetail.tsx',
    'components/protection/AreaQuestionFlow.tsx',
    'components/protection/ProtectionSurface.tsx',
    'components/protection/ProtectionRiskLens.tsx',
    'app/(protected)/protection/areas/[area]/page.tsx',
    'lib/onboarding/protection-profile/map-rows.ts',
    'lib/monetization/upgrade-copy.el.ts',
    'lib/pricing/public-pricing-content.ts',
    'lib/help-content.ts',
    'lib/services/gap-engine/portfolio-rules.ts',
]

describe('Greek UI has no unaccented multi-syllable words (missing-accent typos)', () => {
    for (const file of FILES) {
        it(file, () => {
            const src = readFileSync(file, 'utf-8')
            const offenders = new Set<string>()
            for (const m of src.matchAll(/['"]([^'"]{2,300})['"]/g)) {
                for (const w of m[1].match(GREEK_WORD) ?? []) {
                    if (w.length < 5) continue
                    if (isAllUpper(w)) continue
                    if (ACCENTED.test(w)) continue
                    if (EXEMPT.has(w.toLowerCase())) continue
                    offenders.add(w)
                }
            }
            expect([...offenders], `unaccented Greek in ${file}`).toEqual([])
        })
    }
})
