import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// proxy.ts transitively imports lib/rate-limit → lib/env, whose zod schema
// requires production secrets this test never touches. The classifier under
// test is pure; stub the rate limiter out of the import chain.
vi.mock('@/lib/rate-limit', () => ({
    rateLimit: vi.fn(async () => ({ success: true })),
}))

import { decideRoleRedirect } from '@/proxy'

/**
 * Route-ownership guard: every route in docs/transformation/SURFACES.md is
 * reachable by the role that owns it.
 *
 * The defect this exists for: proxy.ts classified role routes with
 * `pathname.startsWith(prefix)`, which cannot say "a child belongs to a
 * different role than its parent". `/insights/risk-profile` (B2C — it reads
 * the caller's own policyholderProfile) starts with `/insights` (the
 * adviser's book), so every policyholder was bounced to /dashboard and the
 * surface was unreachable. The identical collision had already been found for
 * /dashboard vs /dashboard/agent and patched with a hand-written special
 * case — the miss was in the RULE, so this guard checks the rule's OUTPUT for
 * every declared route rather than hand-listing the known collisions.
 *
 * Universe: enumerated from SURFACES.md (§1 B2C table → policyholder-owned,
 * §4 B2B Agent table → agent-owned), never hand-listed here. A new route added
 * to that document is guarded the moment the row lands; a parser that stops
 * finding rows fails the sanity floor below instead of passing vacuously.
 *
 * Probe fixture (CLAUDE.md: "a guard without a probe is not a guard"): the
 * hypothetical-collision cases at the bottom feed the SAME violation machinery
 * a B2C child declared under an agent-owned parent and assert it goes red —
 * and red *because the routing decision itself returned a bounce*, not because
 * a file changed.
 */

type Owner = 'policyholder' | 'agent'

const SURFACES_PATH = join(process.cwd(), 'docs', 'transformation', 'SURFACES.md')
const surfaces = readFileSync(SURFACES_PATH, 'utf8')

/** Route paths from the first cell of every table row in a section slice. */
function tableRoutes(startMarker: string, endMarker: string): string[] {
    const start = surfaces.indexOf(startMarker)
    if (start === -1) throw new Error(`SURFACES.md no longer contains section marker "${startMarker}" — update the guard's parser, do not delete it.`)
    const end = surfaces.indexOf(endMarker, start)
    const block = surfaces.slice(start, end === -1 ? undefined : end)
    return [...block.matchAll(/^\|\s*`(\/[^`]*)`\s*\|/gm)].map((m) => m[1])
}

const b2cRoutes = tableRoutes('## 1. B2C Routes', '## 2.')
const agentRoutes = tableRoutes('### B2B Agent Routes', '### Admin Routes')

/**
 * A dynamic segment can be any value, so substitute one that is certainly not
 * a literal segment of any ownership pattern.
 */
const concretize = (route: string) => route.replace(/\[[^\]]+\]/g, 'seg-3f9a')

function ownershipViolations(entries: ReadonlyArray<{ route: string; owner: Owner }>) {
    const violations: { route: string; owner: Owner; bouncedTo: string }[] = []
    for (const { route, owner } of entries) {
        const bouncedTo = decideRoleRedirect(concretize(route), owner)
        if (bouncedTo !== null) violations.push({ route, owner, bouncedTo })
    }
    return violations
}

describe('SURFACES.md enumeration is alive (parser sanity floor)', () => {
    it('finds the B2C table and its known members', () => {
        expect(b2cRoutes.length).toBeGreaterThanOrEqual(20)
        expect(b2cRoutes).toContain('/insights/risk-profile')
        expect(b2cRoutes).toContain('/dashboard')
        expect(b2cRoutes).toContain('/coverage-insights')
    })

    it('finds the B2B agent table and its known members', () => {
        expect(agentRoutes.length).toBeGreaterThanOrEqual(15)
        expect(agentRoutes).toContain('/insights/book')
        expect(agentRoutes).toContain('/wallet/[id]/review')
        expect(agentRoutes).toContain('/dashboard/agent')
    })
})

describe('every SURFACES.md B2C route is reachable by a policyholder', () => {
    it.each(b2cRoutes)('%s', (route) => {
        const bouncedTo = decideRoleRedirect(concretize(route), 'policyholder')
        expect(
            bouncedTo,
            `SURFACES.md §1 owns "${route}" as B2C, but the proxy bounces a policyholder to ` +
            `"${bouncedTo}" — a parent/child ownership collision. Declare the child's owner in ` +
            `ROUTE_OWNERSHIP (proxy.ts); do not add a hand-written exception.`
        ).toBeNull()
    })
})

describe('every SURFACES.md B2B agent route is reachable by an agent', () => {
    it.each(agentRoutes)('%s', (route) => {
        const bouncedTo = decideRoleRedirect(concretize(route), 'agent')
        expect(
            bouncedTo,
            `SURFACES.md §4 owns "${route}" as B2B agent, but the proxy bounces an agent to ` +
            `"${bouncedTo}" — a parent/child ownership collision. Declare the child's owner in ` +
            `ROUTE_OWNERSHIP (proxy.ts); do not add a hand-written exception.`
        ).toBeNull()
    })
})

describe('the cross-role gates still stand', () => {
    it('bounces a policyholder off agent-owned trees', () => {
        expect(decideRoleRedirect('/insights', 'policyholder')).toBe('/dashboard')
        expect(decideRoleRedirect('/insights/book', 'policyholder')).toBe('/dashboard')
        expect(decideRoleRedirect('/customers', 'policyholder')).toBe('/dashboard')
        expect(decideRoleRedirect('/customers/abc/policy/def', 'policyholder')).toBe('/dashboard')
        expect(decideRoleRedirect('/team', 'policyholder')).toBe('/dashboard')
        expect(decideRoleRedirect('/dashboard/agent', 'policyholder')).toBe('/dashboard')
    })

    it('bounces an agent off policyholder-owned trees', () => {
        expect(decideRoleRedirect('/dashboard', 'agent')).toBe('/dashboard/agent')
        expect(decideRoleRedirect('/wallet', 'agent')).toBe('/dashboard/agent')
        expect(decideRoleRedirect('/wallet/abc/edit', 'agent')).toBe('/dashboard/agent')
        expect(decideRoleRedirect('/coverage-insights', 'agent')).toBe('/dashboard/agent')
        expect(decideRoleRedirect('/home', 'agent')).toBe('/dashboard/agent')
        expect(decideRoleRedirect('/insights/risk-profile', 'agent')).toBe('/dashboard/agent')
    })

    it('keeps /dashboard vs /dashboard/agent from looping (the warning proxy.ts already carried)', () => {
        expect(decideRoleRedirect('/dashboard/agent', 'agent')).toBeNull()
        expect(decideRoleRedirect('/dashboard', 'policyholder')).toBeNull()
    })

    it('keeps the /agent tree shared: exact page is the customer view, children are the agent tools', () => {
        expect(decideRoleRedirect('/agent', 'policyholder')).toBeNull()
        expect(decideRoleRedirect('/agent', 'agent')).toBe('/dashboard/agent')
        expect(decideRoleRedirect('/agent/', 'agent')).toBe('/dashboard/agent')
        expect(decideRoleRedirect('/agent/settings', 'agent')).toBeNull()
        expect(decideRoleRedirect('/agent/pricing', 'agent')).toBeNull()
    })

    it('gates /admin to admins and never bounces an admin', () => {
        expect(decideRoleRedirect('/admin/users', 'policyholder')).toBe('/dashboard')
        expect(decideRoleRedirect('/admin/users', 'agent')).toBe('/dashboard/agent')
        expect(decideRoleRedirect('/admin/users', 'admin')).toBeNull()
        expect(decideRoleRedirect('/dashboard', 'admin')).toBeNull()
        expect(decideRoleRedirect('/customers', 'admin')).toBeNull()
    })

    it('matches whole path segments, never raw prefixes', () => {
        // "/insightsfoo" is not "/insights"; a prefix matcher classifies it
        // agent-only and a segment matcher leaves it alone. No such route
        // exists — the assertion pins the RULE, which is what was broken.
        expect(decideRoleRedirect('/insightsfoo', 'policyholder')).toBeNull()
        expect(decideRoleRedirect('/teamwork', 'policyholder')).toBeNull()
        expect(decideRoleRedirect('/walletish', 'agent')).toBeNull()
    })

    it('leaves shared surfaces ungated for both roles', () => {
        for (const route of ['/help', '/activity', '/collaboration/threads/abc']) {
            expect(decideRoleRedirect(route, 'policyholder'), route).toBeNull()
            expect(decideRoleRedirect(route, 'agent'), route).toBeNull()
        }
    })
})

describe('probe: the guard catches the NEXT prefix collision, not just this one', () => {
    it('flags a hypothetical B2C child declared under an agent-owned parent', () => {
        // If SURFACES.md ever declares a policyholder-owned child under
        // /customers (an agent tree) without a matching ROUTE_OWNERSHIP row,
        // the enumeration above goes red exactly like this:
        const probe = ownershipViolations([
            { route: '/customers/[id]/shared-report', owner: 'policyholder' },
        ])
        expect(probe).toHaveLength(1)
        // The violation carries the redirect target the classifier returned —
        // proof the probe exercised the routing decision itself, not a file diff.
        expect(probe[0].bouncedTo).toBe('/dashboard')
    })

    it('flags the mirror case: an agent child under a policyholder-owned parent', () => {
        const probe = ownershipViolations([
            { route: '/wallet/[id]/broker-notes', owner: 'agent' },
        ])
        expect(probe).toHaveLength(1)
        expect(probe[0].bouncedTo).toBe('/dashboard/agent')
    })

    it('control: a declared ownership override clears the flag', () => {
        // /insights/risk-profile is exactly such a child, with its owner
        // declared — the machinery that flags the probes passes it.
        expect(ownershipViolations([
            { route: '/insights/risk-profile', owner: 'policyholder' },
            { route: '/wallet/[id]/review', owner: 'agent' },
        ])).toEqual([])
    })
})
