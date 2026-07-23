import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Checkbox, Radio } from '@/components/ui/form/Choice'
import { StatTile, StatGrid } from '@/components/ui/StatTile'
import { Shield } from 'lucide-react'

describe('Checkbox / Radio', () => {
    it('makes the LABEL part of the target, not just the 16px box', async () => {
        const onChange = vi.fn()
        render(<Checkbox label="Share with my advisor" onChange={onChange} />)
        // Clicking the text must toggle it — the 32 hand-rolled instances put the
        // input beside an unassociated <label>, so only the box was clickable.
        await userEvent.click(screen.getByText('Share with my advisor'))
        expect(onChange).toHaveBeenCalled()
    })

    it('binds the label to the control', () => {
        render(<Checkbox label="Marketing emails" />)
        expect(screen.getByLabelText('Marketing emails')).toBeTruthy()
    })

    it('exposes an error to assistive tech and announces it', () => {
        render(<Checkbox label="Accept terms" error="Required to continue" />)
        const box = screen.getByLabelText(/Accept terms/)
        expect(box.getAttribute('aria-invalid')).toBe('true')
        const msg = document.getElementById(box.getAttribute('aria-describedby')!.split(' ')[0])
        expect(msg?.textContent).toBe('Required to continue')
        expect(msg?.getAttribute('role')).toBe('alert')
    })

    it('associates the hint via aria-describedby', () => {
        render(<Checkbox label="Analytics" hint="Helps us improve the product" />)
        const box = screen.getByLabelText(/Analytics/)
        const ids = (box.getAttribute('aria-describedby') || '').split(' ')
        const texts = ids.map((i) => document.getElementById(i)?.textContent)
        expect(texts).toContain('Helps us improve the product')
    })

    it('renders a radio as a radio', () => {
        render(<Radio name="plan" label="Annual" />)
        expect(screen.getByLabelText('Annual').getAttribute('type')).toBe('radio')
    })

    it('gives the row a 44px minimum height', () => {
        const { container } = render(<Checkbox label="Tap me" />)
        expect(container.querySelector('label')?.className).toContain('min-h-11')
    })
})

describe('StatTile / StatGrid', () => {
    it('renders label, value and hint', () => {
        render(<StatTile label="Active" value={3} hint="of 4 added" icon={Shield} accent="positive" />)
        expect(screen.getByText('Active')).toBeTruthy()
        expect(screen.getByText('3')).toBeTruthy()
        expect(screen.getByText('of 4 added')).toBeTruthy()
    })

    it('does NOT truncate the hint — a clipped metric is worse than a taller tile', () => {
        const { container } = render(<StatTile label="X" value={1} hint="a long hint that used to be cut off" />)
        const hint = screen.getByText('a long hint that used to be cut off')
        expect(hint.className).not.toContain('truncate')
        expect(container).toBeTruthy()
    })

    it('lets a custom visual replace the icon chip', () => {
        render(<StatTile label="Score" value={72} visual={<span data-testid="ring" />} />)
        expect(screen.getByTestId('ring')).toBeTruthy()
    })

    it('is two-up on mobile and four-up only from xl', () => {
        const { container } = render(<StatGrid><div /></StatGrid>)
        const cls = container.firstElementChild?.className || ''
        expect(cls).toContain('grid-cols-2')
        expect(cls).toContain('xl:grid-cols-4')
        // lg would leave ~170px per tile once the shell sidebar is subtracted.
        expect(cls).not.toContain('lg:grid-cols-4')
    })

    it('uses the responsive density step, not a fixed padding', () => {
        const { container } = render(<StatTile label="A" value={1} />)
        expect(container.firstElementChild?.className).toContain('pw-pad-tight')
    })
})
