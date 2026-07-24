import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

const card = readFileSync('components/agent/ActionQueueCard.tsx', 'utf-8')
const dashboard = readFileSync('app/(protected)/dashboard/agent/page.tsx', 'utf-8')
const el = readFileSync('lib/i18n/translations/el.ts', 'utf-8')
const en = readFileSync('lib/i18n/translations/en.ts', 'utf-8')

/**
 * The action queue is the agent's primary work surface — expiring policies and
 * the commission at risk behind them. It rendered items.slice(0, 5) while the
 * badge showed the true total, and its only "view all" control was gated behind
 * an onViewAll prop that no caller passed. An agent with 12 renewals at risk was
 * told there were 12, shown 5, and had no route to the rest.
 */
describe('the agent can reach every item in their action queue', () => {
    it('does not hard-truncate the list', () => {
        expect(card).toMatch(/showAll \? items : items\.slice\(0, COLLAPSED_COUNT\)/)
    })

    it('offers the expand control whenever the queue is longer than the collapsed view', () => {
        // Must depend only on the count — not on an optional prop a caller may
        // omit. (Matching code, not the comment that explains the old bug.)
        expect(card).toMatch(/\{totalCount > COLLAPSED_COUNT && \(/)
        expect(card).not.toMatch(/onViewAll\??:/)
        expect(card).not.toMatch(/onClick=\{onViewAll\}/)
    })

    it('reports the expanded state to assistive tech', () => {
        expect(card).toMatch(/aria-expanded=\{showAll\}/)
    })
})

/**
 * Greek is the default language. The server builds `description` in English off
 * the raw lob enum ("motor expires 25/5/2027"); the card must localize instead.
 */
describe('queue lines are localized, not raw server English', () => {
    it('builds the line from type + fields rather than rendering description', () => {
        expect(card).toMatch(/const description = describeItem\(item, language, t\)/)
        expect(card).not.toMatch(/\{item\.description\}/)
    })

    it('localizes the line of business through the insurance taxonomy', () => {
        expect(card).toMatch(/normalizeBranch\(item\.lineOfBusiness\)/)
        expect(card).toMatch(/branch\.label\[lang\]/)
    })

    it('still ships the raw lob key from the server for the card to localize', () => {
        expect(dashboard).toMatch(/lineOfBusiness: policy\.lineOfBusiness/)
    })

    it('has the queue copy in both languages', () => {
        for (const key of ['queueExpiring', 'queueNoPolicies', 'queueShowAll', 'queueShowFewer']) {
            expect(el, `el.ts missing ${key}`).toContain(`${key}:`)
            expect(en, `en.ts missing ${key}`).toContain(`${key}:`)
        }
        // The placeholders the card substitutes must survive translation.
        expect(el).toMatch(/queueExpiring: "\{lob\} λήγει \{date\}"/)
        expect(el).toMatch(/queueShowAll: "[^"]*\{count\}/)
    })
})
