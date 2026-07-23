import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { useTabs } from '@/hooks/useTabs'

function Harness() {
    const ids = ['a', 'b', 'c'] as const
    const [active, setActive] = useState<(typeof ids)[number]>('a')
    const { tabProps, panelProps } = useTabs(ids, active, setActive)
    return (
        <div>
            <div role="tablist" aria-label="Test">
                {ids.map((id) => (
                    <button key={id} {...tabProps(id)}>{id}</button>
                ))}
            </div>
            <div {...panelProps}>panel-{active}</div>
        </div>
    )
}

/**
 * Two agent screens (client detail, agent landing) share this so the WAI-ARIA
 * tabs behaviour is written once. Both previously rendered plain buttons.
 */
describe('useTabs', () => {
    it('binds the active tab to a single labelled panel', () => {
        render(<Harness />)
        const selected = screen.getAllByRole('tab').filter((t) => t.getAttribute('aria-selected') === 'true')
        expect(selected).toHaveLength(1)
        const panel = screen.getByRole('tabpanel')
        expect(panel.getAttribute('aria-labelledby')).toBe(selected[0].id)
    })

    it('keeps only the active tab in the tab order', () => {
        render(<Harness />)
        const tabs = screen.getAllByRole('tab')
        expect(tabs.filter((t) => t.getAttribute('tabindex') === '0')).toHaveLength(1)
    })

    it('moves selection with Arrow/Home/End and wraps', async () => {
        render(<Harness />)
        const tabs = screen.getAllByRole('tab')
        tabs[0].focus()
        await userEvent.keyboard('{ArrowLeft}')  // wraps to last
        expect(tabs[2].getAttribute('aria-selected')).toBe('true')
        await userEvent.keyboard('{Home}')
        expect(tabs[0].getAttribute('aria-selected')).toBe('true')
        await userEvent.keyboard('{End}')
        expect(tabs[2].getAttribute('aria-selected')).toBe('true')
    })

    it('activates a tab on click', async () => {
        render(<Harness />)
        await userEvent.click(screen.getByRole('tab', { name: 'b' }))
        expect(screen.getByRole('tabpanel').textContent).toBe('panel-b')
    })
})
