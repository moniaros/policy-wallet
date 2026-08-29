import { describe, expect, it, beforeEach, vi } from 'vitest'
import { render, fireEvent, screen, within } from '@testing-library/react'
import { NEEDS_STEPS, isStepComplete, type NeedsQuestion } from '@/lib/needs/questions'
import { NeedsCheck } from '@/components/needs/NeedsCheck'

/**
 * A visitor who owns no boat, runs no business and climbs nothing must be able
 * to leave the step.
 *
 * `isStepComplete` treats a multi question as answered when its array EXISTS —
 * an empty array is the affirmative answer "none of these", and
 * `toRiskProfilePayload` documents it as exactly that. But nothing created the
 * array until a choice was ticked, so the only route to "none" was to tick an
 * option and untick it. Anyone the list genuinely did not describe hit a
 * disabled Continue on step 5 and stopped, while the step's own intro told them
 * «αν δεν ισχύει κανένα, προχωρήστε». Reported from a phone; it is not a
 * viewport bug, it was on every screen.
 *
 * WHY NOT JUST MAKE MULTI QUESTIONS COMPLETE BY DEFAULT. Because the distinction
 * this form is built on is "we asked and you said no" versus "we never asked" —
 * the stated reason it is six steps rather than one screen is that a visitor can
 * see they were asked about boats, so silence in the result means "does not
 * apply". Defaulting to complete would let someone who scrolled past look like
 * they had answered, and the outcome would then say nothing about boats with a
 * confidence it had not earned. So the answer is an explicit control, not a
 * looser gate — and the gate stays exactly as strict as it was.
 *
 * These assert the OUTCOME a visitor gets, not the shape of the state: the bug
 * was invisible in the data model (an empty array was always valid) and only
 * existed in the fact that no control produced one.
 */

const MULTI: NeedsQuestion[] = NEEDS_STEPS.flatMap((s) => s.questions).filter((q) => q.kind === 'multi')

beforeEach(() => {
    window.localStorage.clear()
    window.matchMedia = ((q: string) => ({
        matches: false, media: q, onchange: null,
        addEventListener: () => undefined, removeEventListener: () => undefined,
        addListener: () => undefined, removeListener: () => undefined, dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia
})

describe('every multi question offers "none of these"', () => {
    it('there ARE multi questions — a silent zero would pass every assertion below', () => {
        expect(MULTI.length).toBeGreaterThanOrEqual(3)
    })

    it('an empty array already counts as answered, so the gap was the control, not the rule', () => {
        for (const step of NEEDS_STEPS) {
            const answers: Record<string, unknown> = {}
            for (const q of step.questions) answers[q.id] = q.kind === 'multi' ? [] : q.choices[0].value
            expect(isStepComplete(step, answers as never), `${step.id}`).toBe(true)
        }
    })

    it('and a MISSING array does not — which is what blocked the visitor', () => {
        const step = NEEDS_STEPS.find((s) => s.questions.some((q) => q.kind === 'multi'))!
        const answers: Record<string, unknown> = {}
        for (const q of step.questions) if (q.kind !== 'multi') answers[q.id] = q.choices[0].value
        expect(isStepComplete(step, answers as never)).toBe(false)
    })

    it.each(MULTI.map((q) => [String(q.id), q] as const))(
        'question %s renders a none control whose label agrees with its prompt',
        (_id, q) => {
            const { container } = render(<NeedsCheck locale="el" />)
            const fieldsetFor = (prompt: string) =>
                [...container.querySelectorAll('fieldset')].find(
                    (f) => f.querySelector('legend')?.textContent === prompt
                ) as HTMLElement | undefined

            // walk forward to the step that holds this question, answering the
            // first choice of everything on the way
            const stepIndex = NEEDS_STEPS.findIndex((s) => s.questions.includes(q))
            for (let i = 0; i < stepIndex; i++) {
                for (const question of NEEDS_STEPS[i].questions) {
                    const fs = fieldsetFor(question.prompt.el)!
                    fireEvent.click(within(fs).getByText(question.choices[0].label.el).closest('label')!)
                }
                fireEvent.click(screen.getByRole('button', { name: /Συνέχεια/ }))
            }

            const fs = fieldsetFor(q.prompt.el)
            expect(fs, `fieldset for ${String(q.id)} was not reached`).toBeTruthy()
            const label = (q.noneLabel ?? { el: 'Κανένα από αυτά' }).el
            expect(within(fs!).getByText(label)).toBeTruthy()
        }
    )
})

describe('the visitor can finish the form without ticking a single exposure', () => {
    it('Continue enables on the multi step once "none of these" is chosen, and not before', () => {
        const { container } = render(<NeedsCheck locale="el" />)
        // steps 1-4 are single-choice: answer them to reach the multi step
        const multiStepIndex = NEEDS_STEPS.findIndex((s) => s.questions.some((q) => q.kind === 'multi'))
        for (let i = 0; i < multiStepIndex; i++) {
            for (const question of NEEDS_STEPS[i].questions) {
                const fs = [...container.querySelectorAll('fieldset')].find(
                    (f) => f.querySelector('legend')?.textContent === question.prompt.el
                )!
                fireEvent.click(within(fs as HTMLElement).getByText(question.choices[0].label.el).closest('label')!)
            }
            fireEvent.click(screen.getByRole('button', { name: /Συνέχεια/ }))
        }

        const step = NEEDS_STEPS[multiStepIndex]
        const cont = () => screen.getByRole('button', { name: /Συνέχεια|Δείτε/ }) as HTMLButtonElement

        // the reported state: nothing ticked, and no way forward
        expect(cont().disabled, 'the multi step should start blocked — that is the honest gate').toBe(true)

        for (const q of step.questions) {
            const fs = [...container.querySelectorAll('fieldset')].find(
                (f) => f.querySelector('legend')?.textContent === q.prompt.el
            )!
            const label = q.kind === 'multi' ? (q.noneLabel ?? { el: 'Κανένα από αυτά' }).el : q.choices[0].label.el
            fireEvent.click(within(fs as HTMLElement).getByText(label).closest('label')!)
        }

        expect(
            cont().disabled,
            'after answering "none of these" the visitor must be able to continue'
        ).toBe(false)
    })

    it('picking a real exposure deselects "none", and vice versa', () => {
        const { container } = render(<NeedsCheck locale="el" />)
        const multiStepIndex = NEEDS_STEPS.findIndex((s) => s.questions.some((q) => q.kind === 'multi'))
        for (let i = 0; i < multiStepIndex; i++) {
            for (const question of NEEDS_STEPS[i].questions) {
                const fs = [...container.querySelectorAll('fieldset')].find(
                    (f) => f.querySelector('legend')?.textContent === question.prompt.el
                )!
                fireEvent.click(within(fs as HTMLElement).getByText(question.choices[0].label.el).closest('label')!)
            }
            fireEvent.click(screen.getByRole('button', { name: /Συνέχεια/ }))
        }
        const q = NEEDS_STEPS[multiStepIndex].questions.find((x) => x.kind === 'multi')!
        const fs = () =>
            [...container.querySelectorAll('fieldset')].find(
                (f) => f.querySelector('legend')?.textContent === q.prompt.el
            )! as HTMLElement
        const box = (text: string) =>
            within(fs()).getByText(text).closest('label')!.querySelector('input') as HTMLInputElement

        fireEvent.click(within(fs()).getByText('Κανένα από αυτά').closest('label')!)
        expect(box('Κανένα από αυτά').checked).toBe(true)

        fireEvent.click(within(fs()).getByText(q.choices[0].label.el).closest('label')!)
        expect(box(q.choices[0].label.el).checked).toBe(true)
        expect(box('Κανένα από αυτά').checked, '"none" must clear when a real option is picked').toBe(false)

        fireEvent.click(within(fs()).getByText('Κανένα από αυτά').closest('label')!)
        expect(box(q.choices[0].label.el).checked, 'choosing "none" must clear the real options').toBe(false)
    })
})
