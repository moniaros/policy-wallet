import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Handshake } from 'lucide-react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { EmptyState } from '@/components/ui/EmptyState'

/**
 * The shared empty state headlines at `h3`, which is right when it sits inside
 * a page that already has an `<h1>` — the common case, and why the default must
 * not change. It is wrong when the empty state IS the page: `/agent` renders
 * nothing else for anyone without a linked advisor (the default for every new
 * policyholder), so that route shipped with no `<h1>` at all and its first
 * heading at level 3.
 *
 * The audit recorded this as "no h1 under the ADMIN session" and guessed at a
 * role-gated view. It is data-gated, not role-gated — the admin fixture simply
 * had no advisor.
 */

describe('EmptyState heading level', () => {
    const base = {
        icon: Handshake,
        headline: 'Δεν έχετε σύμβουλο',
        description: 'Συνδεθείτε με έναν ασφαλιστικό σύμβουλο.',
    }

    it('defaults to h3 so nested usages keep their page h1 intact', () => {
        render(<EmptyState {...base} />)
        const heading = screen.getByRole('heading', { name: base.headline })
        expect(heading.tagName).toBe('H3')
    })

    it('renders an h1 when the empty state is the whole page', () => {
        render(<EmptyState {...base} headingLevel="h1" />)
        const heading = screen.getByRole('heading', { name: base.headline })
        expect(heading.tagName).toBe('H1')
    })

    it('keeps the visual styling identical across levels — the change is semantic only', () => {
        const { unmount } = render(<EmptyState {...base} />)
        const asH3 = screen.getByRole('heading', { name: base.headline }).className
        unmount()
        render(<EmptyState {...base} headingLevel="h1" />)
        const asH1 = screen.getByRole('heading', { name: base.headline }).className
        expect(asH1).toBe(asH3)
    })
})

describe('/agent no-advisor view supplies the route h1', () => {
    it('passes headingLevel="h1" to the empty state that IS the page', () => {
        const source = readFileSync(
            join(process.cwd(), 'app/(protected)/agent/AgentClient.tsx'),
            'utf8'
        )
        const start = source.indexOf('function NoAgentEmptyState')
        expect(start, 'NoAgentEmptyState not found — test is stale').toBeGreaterThan(-1)
        const body = source.slice(start, source.indexOf('\nexport function AgentClient'))
        expect(body).toMatch(/headingLevel="h1"/)
    })
})
