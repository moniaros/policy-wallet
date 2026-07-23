import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { render, screen } from '@testing-library/react'
import { Alert } from '@/components/ui/Alert'

/**
 * 31 hand-rolled alert containers across 25 files, and the most common styling
 * signature appeared 3 times — padding varied over p-1/p-1.5/p-2/p-4, radius
 * over lg/xl/full, and the text was red-600 or red-700 depending on the file.
 */
describe('Alert', () => {
    it('announces a failure but keeps a confirmation polite', () => {
        // A failure should interrupt; a success should not talk over the user.
        const { unmount } = render(<Alert variant="error">Upload failed</Alert>)
        expect(screen.getByRole('alert').textContent).toContain('Upload failed')
        unmount()

        render(<Alert variant="success">Saved</Alert>)
        expect(screen.getByRole('status').textContent).toContain('Saved')
    })

    it('treats a warning as a failure for announcement purposes', () => {
        render(<Alert variant="warning">Policy expires soon</Alert>)
        expect(screen.getByRole('alert')).toBeTruthy()
    })

    it('hides the decorative icon from assistive tech', () => {
        const { container } = render(<Alert variant="error">Nope</Alert>)
        expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')
    })

    it('stacks the action under the message on narrow screens', () => {
        const { container } = render(
            <Alert variant="error" action={<button>Retry</button>}>Failed</Alert>
        )
        const cls = container.firstElementChild?.className || ''
        // A long action label must not squeeze the text into a 2-character column.
        expect(cls).toContain('flex-col')
        expect(cls).toContain('sm:flex-row')
    })

    it('renders a title above the body', () => {
        render(<Alert variant="error" title="Could not save">Try again</Alert>)
        expect(screen.getByText('Could not save')).toBeTruthy()
        expect(screen.getByText('Try again')).toBeTruthy()
    })
})

/**
 * Only 2 of ~215 text-entry controls go through the shared form kit, so the
 * floor has to live in the base layer where a hand-written control cannot opt
 * out of it.
 */
describe('mobile form-control floor (globals.css)', () => {
    const css = readFileSync('app/globals.css', 'utf-8')

    it('forces 16px on small screens so iOS Safari does not zoom the page on focus', () => {
        const block = css.match(/@media \(max-width: 767px\) \{[\s\S]*?\n\}/)?.[0] || ''
        expect(block, 'mobile control floor block missing').toBeTruthy()
        expect(block).toContain('font-size: 16px')
        expect(block).toMatch(/input:not\(\[type="checkbox"\]\)/)
        expect(block).toContain('select')
        expect(block).toContain('textarea')
    })

    it('gives controls a 44px tap target', () => {
        expect(css).toMatch(/min-height: 44px/)
    })

    it('exempts checkboxes and radios, which get their target from the row wrapper', () => {
        const block = css.match(/@media \(max-width: 767px\) \{[\s\S]*?\n\}/)?.[0] || ''
        expect(block).toContain(':not([type="radio"])')
    })
})

/**
 * 57 of 151 buttons sat under 44px on a phone, spread across 47 distinct
 * styling signatures for what is nominally one primary button — so there was no
 * single component in which to fix them.
 */
describe('mobile button floor (globals.css)', () => {
    const css = readFileSync('app/globals.css', 'utf-8')
    const block = css.match(/@media \(max-width: 767px\) \{[\s\S]*?\n\}/)?.[0] || ''

    it('gives every button a 44px tap target on small screens only', () => {
        expect(block).toMatch(/button:not\(\[hidden\]\)/)
        expect(block).toMatch(/\[role="button"\]/)
    })

    it('leaves an opt-out for buttons used inline in a sentence', () => {
        expect(block).toContain('pw-inline-action')
        expect(block).toMatch(/pw-inline-action[\s\S]*?min-height: 0/)
    })

    it('does not apply the floor at desktop widths', () => {
        // Everything above lives inside the max-width query; a bare rule would
        // change every desktop toolbar in the product.
        const outside = css.replace(block, '')
        expect(outside).not.toMatch(/^\s*button:not\(\[hidden\]\)/m)
    })
})

describe('the mobile floor must outrank Tailwind utilities', () => {
    const css = readFileSync('app/globals.css', 'utf-8')

    it('is declared unlayered, not inside @layer base', () => {
        // It started in @layer base. The 44px min-height worked there (nothing
        // else sets min-height), but `font-size: 16px` silently lost to the
        // `text-sm` utility in @layer utilities — every control still rendered
        // at 14px and iOS Safari would still have zoomed. Unlayered rules beat
        // every layered rule. Caught by measuring the rendered page: the CSS
        // text looked correct the whole time.
        const base = /@layer base \{[\s\S]*?\n\}/.exec(css)?.[0] || ''
        expect(base).not.toContain('max-width: 767px')
        expect(css).toMatch(/\n@media \(max-width: 767px\) \{/)
    })
})
