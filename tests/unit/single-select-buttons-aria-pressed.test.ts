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
    // QA round 5 — the same defect on three ADVISOR surfaces, where each group
    // was additionally headed by a <label> that labelled no control at all.
    // Opportunity status is the one that writes the pipeline.
    {
        file: 'components/agent/InviteModal.tsx',
        expr: [/aria-pressed=\{scope === 'upload_only'\}/, /aria-pressed=\{scope === 'portfolio'\}/],
    },
    {
        file: 'components/agent/OpportunityUpdateModal.tsx',
        expr: [/aria-pressed=\{status === s\.value\}/],
    },
    {
        file: 'components/agent/QuestionnaireSender.tsx',
        expr: [/aria-pressed=\{selectedTemplate === t\.id\}/],
    },
    // QA round 6 — the task-type selector, found by re-sweeping after round 5.
    {
        file: 'components/agent/CreateTaskModal.tsx',
        expr: [/aria-pressed=\{type === t\.value\}/],
    },
]

/**
 * Expand/collapse controls need aria-expanded, not aria-pressed: a label that
 * merely changes wording ("Expand"/"Collapse") never announces STATE.
 */
const disclosureCases: Array<{ file: string; expr: RegExp }> = [
    { file: 'components/agent/ActionQueueCard.tsx', expr: /aria-expanded=\{showAll\}/ },
    { file: 'components/agent/GettingStartedChecklist.tsx', expr: /aria-expanded=\{!collapsed\}/ },
]

/**
 * A <label> only labels a form control. Over a group of choice buttons it is
 * announced as loose text, so the user hears the options with no idea what they
 * are choosing between. These groups now carry a real accessible name.
 */
const groupCases: Array<{ file: string; labelledBy: string }> = [
    { file: 'components/agent/InviteModal.tsx', labelledBy: 'invite-scope-label' },
    { file: 'components/agent/OpportunityUpdateModal.tsx', labelledBy: 'opp-status-label' },
    { file: 'components/agent/QuestionnaireSender.tsx', labelledBy: 'questionnaire-template-label' },
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

describe('disclosure toggles announce their expanded state', () => {
    for (const { file, expr } of disclosureCases) {
        it(`${file}: carries aria-expanded`, () => {
            expect(expr.test(readFileSync(file, 'utf-8')), `${file} missing ${expr}`).toBe(true)
        })
    }
})

describe('choice groups carry a real accessible name', () => {
    for (const { file, labelledBy } of groupCases) {
        it(`${file}: group is named by #${labelledBy}`, () => {
            const src = readFileSync(file, 'utf-8')
            expect(
                new RegExp(`aria-labelledby="${labelledBy}"`).test(src),
                `${file} group missing aria-labelledby="${labelledBy}"`
            ).toBe(true)
            // The target must exist, or the name resolves to nothing.
            expect(
                new RegExp(`id="${labelledBy}"`).test(src),
                `${file} missing the element id="${labelledBy}"`
            ).toBe(true)
            // ...and it must no longer be a <label>, which labels no control.
            expect(
                new RegExp(`<label[^>]*id="${labelledBy}"`).test(src),
                `${file} still uses a <label> as a group heading`
            ).toBe(false)
        })
    }
})
