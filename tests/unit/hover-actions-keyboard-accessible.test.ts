import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

/**
 * Several list rows reveal their action buttons (call/email, update, edit) only
 * on `group-hover` — `opacity-0 group-hover:opacity-100`. The buttons stay
 * focusable while opacity-0, so a keyboard user tabs onto INVISIBLE controls
 * (WCAG 2.4.7 focus-visible), and touch users get no hover at all. The reveal
 * must also fire on keyboard focus via `group-focus-within:opacity-100`.
 *
 * These are the rows whose hidden container wraps real <button> actions
 * (decorative hover overlays/chevrons/hints are intentionally excluded).
 */
const FILES = [
    'app/(protected)/opportunities/OpportunitiesClient.tsx',
    'components/agent/CustomerList.tsx',
    'app/(protected)/questionnaires/QuestionnairesClient.tsx',
]

describe('hover-revealed row actions are also revealed by keyboard focus', () => {
    for (const f of FILES) {
        it(`${f}: the action container reveals on focus, not only hover`, () => {
            const src = readFileSync(f, 'utf-8')
            // The action container now reveals on hover AND focus-within.
            expect(
                src,
                `${f}: an opacity-0 group-hover action container is missing ` +
                `group-focus-within:opacity-100 (keyboard focus lands on an invisible button)`,
            ).toMatch(/group-hover:opacity-100 group-focus-within:opacity-100/)
        })
    }
})
