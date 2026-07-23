import { describe, it, expect } from 'vitest'
import { execSync } from 'node:child_process'
import { render } from '@testing-library/react'
import { Skeleton } from '@/components/ui/skeleton'
import { Skeleton as ReExported, DashboardSkeleton, WalletSkeleton } from '@/components/ui/LoadingSkeleton'

/**
 * The product shipped two loading shimmers from two Skeleton modules with 15
 * and 14 importers, so which one you saw depended on which route you were on.
 */
describe('Skeleton — one definition', () => {
    it('LoadingSkeleton re-exports the canonical Skeleton rather than defining its own', () => {
        expect(ReExported).toBe(Skeleton)
    })

    it('does not reintroduce a second hand-rolled shimmer', () => {
        const hits = execSync(
            "grep -rnE 'animate-pulse[^\"'\\''`]*bg-(stone|gray|slate|neutral|zinc)-[0-9]' components app --include='*.tsx' || true",
            { cwd: process.cwd(), encoding: 'utf-8' }
        ).trim()
        // A raw palette colour here means someone rebuilt the placeholder by hand.
        expect(hits, `hand-rolled skeleton tints:\n${hits}`).toBe('')
    })

    it('is visible on a white card — the old bg-muted/50 was #f1f5f9 at half opacity', () => {
        const { container } = render(<Skeleton className="h-4 w-32" />)
        const cls = container.firstElementChild?.className || ''
        expect(cls).not.toContain('bg-muted/50')
        expect(cls).toContain('bg-black/[0.07]')
    })
})

describe('Skeleton — accessibility', () => {
    it('hides individual blocks from assistive tech', () => {
        const { container } = render(<Skeleton className="h-4 w-32" />)
        expect(container.firstElementChild?.getAttribute('aria-hidden')).toBe('true')
    })

    it('announces route-level composites as busy instead of reading empty boxes', () => {
        for (const Composite of [DashboardSkeleton, WalletSkeleton]) {
            const { container } = render(<Composite />)
            const root = container.firstElementChild
            expect(root?.getAttribute('role')).toBe('status')
            expect(root?.getAttribute('aria-busy')).toBe('true')
        }
    })
})
