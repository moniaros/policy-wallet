import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

/**
 * Single-select choice buttons that convey their selected state ONLY visually
 * (a `border-primary`/filled className) leave a screen-reader user unable to tell
 * which option is chosen. These three carry the user's actual answer/choice, so
 * the selected state must be announced via aria-pressed:
 *   - onboarding goal ("what matters most to you?")
 *   - questionnaire boolean + select answers
 *   - proposal decline-reason chips
 * (RiskProfileWizard is sound — it uses ChipToggle, a real sr-only checkbox that
 *  announces its state natively. The codebase already uses aria-pressed widely.)
 */
const cases: Array<{ file: string; expr: RegExp[] }> = [
    { file: 'app/onboarding/flow.tsx', expr: [/aria-pressed=\{goal === g\.key\}/] },
    {
        file: 'components/tasks/QuestionnaireForm.tsx',
        expr: [/aria-pressed=\{answers\[q\.id\] === val\}/, /aria-pressed=\{answers\[q\.id\] === opt\}/],
    },
    { file: 'components/collaboration/ProposalCard.tsx', expr: [/aria-pressed=\{declineReason === r\.value\}/] },
]

describe('single-select choice buttons announce their selected state', () => {
    for (const { file, expr } of cases) {
        it(`${file}: choice buttons carry aria-pressed`, () => {
            const src = readFileSync(file, 'utf-8')
            for (const re of expr) {
                expect(re.test(src), `${file} missing ${re}`).toBe(true)
            }
        })
    }
})
