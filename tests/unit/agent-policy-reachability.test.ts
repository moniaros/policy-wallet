import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

const policiesTab = readFileSync('components/agent/tabs/ClientPoliciesTab.tsx', 'utf-8')
const policyTable = readFileSync('components/wallet/PolicyTable.tsx', 'utf-8')

/**
 * An agent servicing a client must be able to open the client's policy — that is
 * where the contract documents, the analysis, the gaps and the collaboration
 * thread live, and the page already access-gates itself with getPolicyAccess.
 *
 * It was unreachable. The only navigation into it was a button labelled "Renew"
 * that rendered exclusively when `daysToExpiry <= 30 && daysToExpiry >= 0`, so a
 * policy expiring in 60 days — or one already expired — could not be opened at
 * all, and the button's destination offers no renewal action anyway.
 */
describe('agent can open a client policy', () => {
    it('links the policy row to the detail route', () => {
        expect(policiesTab).toMatch(/href=\{`\/customers\/\$\{customerId\}\/policy\/\$\{policy\.policyId\}`\}/)
    })

    it('does not gate that link behind an expiry window', () => {
        // Any daysToExpiry arithmetic left in this file would mean reachability
        // depends on the calendar again.
        expect(policiesTab).not.toMatch(/daysToExpiry/)
    })

    it('keeps row actions clickable above the card-wide stretched link', () => {
        // Without z-10 the ::after overlay swallows the branded-report anchor.
        expect(policiesTab).toMatch(/relative z-10 flex items-center gap-1\.5/)
    })

    it('gives the link an accessible name beyond the line of business', () => {
        expect(policiesTab).toMatch(/aria-label=\{`\$\{lobLabel\} · \$\{policy\.insurerName\}/)
    })
})

/**
 * The product has no insurer integration, so it cannot renew anything. A control
 * that says "Renew policy" and instead spends the user's analysis quota is a
 * false promise made at the moment of highest anxiety (expiring / expired).
 */
describe('no control promises a renewal the product cannot perform', () => {
    it('the policyholder table has no renew action', () => {
        expect(policyTable).not.toMatch(/renewPolicy/)
        expect(policyTable).not.toMatch(/onRenewPolicy/)
    })

    it('still offers the real action it used to be aliased to', () => {
        expect(policyTable).toMatch(/t\.dashboard\.runAnalysis/)
        expect(policyTable).toMatch(/onRunAnalysis\?\.\(policy\.id\)/)
    })

    it('the agent policies tab no longer aliases navigation as renewal', () => {
        expect(policiesTab).not.toMatch(/onRenewPolicy/)
        expect(policiesTab).not.toMatch(/renew:/)
    })
})
