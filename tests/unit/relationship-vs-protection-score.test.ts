import { describe, it, expect } from 'vitest'
import { readFileSync } from "node:fs"
import { globSync } from "../helpers/glob"
import { computeClientRelationshipScore } from '@/lib/agent/health-score'
import { el } from '@/lib/i18n/translations/el'
import { en } from '@/lib/i18n/translations/en'
import { getRoleCopy } from '@/lib/i18n/role-copy'

const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
const read = (f: string) => strip(readFileSync(f, 'utf-8'))

/**
 * The agent's client surface carried TWO 0-100 numbers, both colour-coded
 * green/amber/red, both called scores. One is the gap engine's protection score
 * — a verdict on the client's cover. The other mixes in the agent's own
 * behaviour: 20 points for having contacted the client recently, 10 for the
 * client having activated their account.
 *
 * It was labelled «Βαθμός υγείας», its client-detail donut was headed «Βαθμός
 * υγείας κάλυψης» / "Coverage Health Score", and the customer table column was
 * headed simply «Υγεία» — which in a Greek insurance product reads as the HEALTH
 * INSURANCE branch.
 */
describe('the relationship index is not an insurance verdict', () => {
    const activatedYesterday = {
        lastInteractionDate: new Date(Date.now() - 86_400_000).toISOString(),
        profileComplete: true,
        activationStatus: 'activated',
    }

    it('rates an uninsured client and a badly-covered one the same', () => {
        // No insurance at all, but activated and called yesterday.
        const uninsured = computeClientRelationshipScore({
            ...activatedYesterday, policyCount: 0, openGapsCount: 0, profileComplete: false,
        })
        // One policy, five open gaps, same contact.
        const badlyCovered = computeClientRelationshipScore({
            ...activatedYesterday, policyCount: 1, openGapsCount: 5,
        })
        expect(uninsured).toBe(50)
        expect(badlyCovered).toBe(40)
        // Both land in the same amber band — which is exactly why this number
        // must not be presented as a statement about their cover.
        expect(uninsured >= 40 && uninsured < 70).toBe(true)
        expect(badlyCovered >= 40 && badlyCovered < 70).toBe(true)
    })

    it('moves when only the AGENT changed, not the client', () => {
        const called = computeClientRelationshipScore({
            policyCount: 2, openGapsCount: 0, profileComplete: true,
            activationStatus: 'activated',
            lastInteractionDate: new Date(Date.now() - 3 * 86_400_000).toISOString(),
        })
        const neglected = computeClientRelationshipScore({
            policyCount: 2, openGapsCount: 0, profileComplete: true,
            activationStatus: 'activated',
            lastInteractionDate: new Date(Date.now() - 400 * 86_400_000).toISOString(),
        })
        expect(called - neglected).toBe(20)
    })
})

describe('every label for it describes a relationship, not cover', () => {
    it('the client-detail donut', () => {
        expect(el.clientOverview.healthScore).toBe('Δείκτης σχέσης πελάτη')
        expect(en.clientOverview.healthScore).toBe('Client relationship')
        expect(el.clientOverview.healthScore).not.toMatch(/υγεία|κάλυψη/i)
        expect(en.clientOverview.healthScore).not.toMatch(/coverage|health/i)
    })

    it('its verdict line no longer claims critical gaps', () => {
        expect(el.clientOverview.criticalGaps).toBe('Χωρίς πρόσφατη επαφή')
        expect(en.clientOverview.criticalGaps).toBe('No recent contact')
        expect(el.clientOverview.goodCoverage).not.toMatch(/κάλυψη/i)
        expect(en.clientOverview.goodCoverage).not.toMatch(/coverage/i)
    })

    it('it explains what feeds it, and what it is not', () => {
        expect(el.clientOverview.healthScoreHint).toMatch(/Δεν αποτελεί αξιολόγηση της επάρκειας ασφάλισης/)
        expect(en.clientOverview.healthScoreHint).toMatch(/not an assessment of insurance adequacy/i)
        expect(read('components/agent/tabs/ClientOverviewTab.tsx')).toMatch(/healthScoreHint/)
    })

    it('the avatar dot names itself for assistive tech', () => {
        expect(read('components/agent/ClientCard.tsx')).toMatch(/aria-label=\{`\$\{t\.agentUi\.healthScore\}/)
    })

    it('the customer table column is not headed «Υγεία»', () => {
        expect(getRoleCopy('el').customerList.tableHealth).toBe('Σχέση')
        expect(getRoleCopy('en').customerList.tableHealth).toBe('Relationship')
    })

    it('the tooltip label follows too', () => {
        expect(el.agentUi.healthScore).toBe('Δείκτης σχέσης')
        expect(en.agentUi.healthScore).toBe('Relationship index')
    })
})

/**
 * The name was half the problem — a function called computeClientHealthScore
 * invites the next reader to render it as one.
 */
describe('the code says what it computes', () => {
    it('no caller reaches for a "health score" helper', () => {
        const offenders: string[] = []
        for (const file of [...globSync('app/**/*.tsx'), ...globSync('app/**/*.ts'), ...globSync('components/**/*.tsx')]) {
            if (/getHealthScore(Color|DotColor|Label)|compute(Client)?HealthScore/.test(read(file))) offenders.push(file)
        }
        expect(offenders, `stale name in:\n${offenders.join('\n')}`).toEqual([])
    })
})
