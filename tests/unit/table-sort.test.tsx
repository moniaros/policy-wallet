import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderHook, act } from '@testing-library/react'
import { applySort, useTableSort, SortableColumn } from '@/components/ui/SortableColumn'

type Row = { name: string; premium: number | null; expires: Date | null }
const ROWS: Row[] = [
    { name: 'Παπαδόπουλος', premium: 900, expires: new Date('2026-09-01') },
    { name: 'Αλεξίου', premium: null, expires: null },  // Greek Alpha, not Latin A
    { name: 'Ζαχαρίου', premium: 120, expires: new Date('2026-08-01') },
]
const ACC = {
    name: (r: Row) => r.name,
    premium: (r: Row) => r.premium,
    expires: (r: Row) => r.expires,
}

/**
 * None of the agent tables could be sorted — each arrived in one fixed server
 * order. An agent working the largest premiums first had no way to get there.
 */
describe('applySort', () => {
    it('returns the original order when no sort is applied', () => {
        expect(applySort(ROWS, null, ACC)).toBe(ROWS)
    })

    it('sorts numerically, not lexically', () => {
        const asc = applySort(ROWS, { key: 'premium', direction: 'asc' }, ACC)
        expect(asc.map((r) => r.premium)).toEqual([120, 900, null])
    })

    it('keeps missing values last in BOTH directions', () => {
        // A missing premium is not "cheapest", and a missing expiry is not
        // "soonest" — floating them to the top would put an agent's attention on
        // rows that carry no information.
        for (const direction of ['asc', 'desc'] as const) {
            const sorted = applySort(ROWS, { key: 'premium', direction }, ACC)
            expect(sorted[sorted.length - 1].premium).toBeNull()
        }
    })

    it('sorts dates chronologically', () => {
        const asc = applySort(ROWS, { key: 'expires', direction: 'asc' }, ACC)
        expect(asc[0].expires?.toISOString().slice(0, 10)).toBe('2026-08-01')
    })

    it('orders Greek names with Greek collation', () => {
        const asc = applySort(ROWS, { key: 'name', direction: 'asc' }, ACC)
        expect(asc.map((r) => r.name)).toEqual(['Αλεξίου', 'Ζαχαρίου', 'Παπαδόπουλος'])
    })

    it('sorts a Latin lookalike after the Greek alphabet', () => {
        // Not a defect to fix here, but worth pinning: Greek insurance data
        // really does contain names typed with Latin Α/Ο/Ε lookalikes, and under
        // 'el' collation those land at the end of the list rather than beside
        // their Greek twin. Anyone hunting a missing client should know that.
        const mixed = applySort(
            [{ name: 'Ζήτα' }, { name: 'Aλφα' }],  // Latin A
            { key: 'name', direction: 'asc' },
            { name: (r: { name: string }) => r.name }
        )
        expect(mixed.map((r) => r.name)).toEqual(['Ζήτα', 'Aλφα'])
    })

    it('does not mutate the input', () => {
        const before = [...ROWS]
        applySort(ROWS, { key: 'premium', direction: 'desc' }, ACC)
        expect(ROWS).toEqual(before)
    })
})

describe('useTableSort', () => {
    it('cycles asc -> desc -> back to the server default', () => {
        const { result } = renderHook(() => useTableSort<'premium'>())
        act(() => result.current.toggle('premium'))
        expect(result.current.sort).toEqual({ key: 'premium', direction: 'asc' })
        act(() => result.current.toggle('premium'))
        expect(result.current.sort).toEqual({ key: 'premium', direction: 'desc' })
        // The default order is meaningful (renewals arrive by expiry date), so a
        // user has to be able to get back to it.
        act(() => result.current.toggle('premium'))
        expect(result.current.sort).toBeNull()
    })

    it('starts a new column at ascending', () => {
        const { result } = renderHook(() => useTableSort<'premium' | 'name'>())
        act(() => result.current.toggle('premium'))
        act(() => result.current.toggle('name'))
        expect(result.current.sort).toEqual({ key: 'name', direction: 'asc' })
    })
})

describe('SortableColumn', () => {
    it('announces sort state via aria-sort, not only an arrow', () => {
        const { container, rerender } = render(
            <table><thead><tr>
                <SortableColumn columnKey="premium" sort={null} onSort={() => {}} label="Premium" />
            </tr></thead></table>
        )
        expect(container.querySelector('th')?.getAttribute('aria-sort')).toBe('none')

        rerender(
            <table><thead><tr>
                <SortableColumn columnKey="premium" sort={{ key: 'premium', direction: 'desc' }} onSort={() => {}} label="Premium" />
            </tr></thead></table>
        )
        expect(container.querySelector('th')?.getAttribute('aria-sort')).toBe('descending')
    })

    it('is operable as a button', async () => {
        const onSort = vi.fn()
        render(
            <table><thead><tr>
                <SortableColumn columnKey="premium" sort={null} onSort={onSort} label="Premium" />
            </tr></thead></table>
        )
        await userEvent.click(screen.getByRole('button', { name: /Premium/ }))
        expect(onSort).toHaveBeenCalledWith('premium')
    })
})
