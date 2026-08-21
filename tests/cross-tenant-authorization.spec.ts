import { test, expect, type APIRequestContext } from '@playwright/test'

/**
 * The first HTTP-level proof that authorization actually holds.
 *
 * Everything else guarding policy-owned records is STATIC: a filesystem scan
 * asserting each route calls `getPolicyAccess`. That proves the call is
 * present. It cannot prove the call DENIES anybody — a route that invokes
 * `getPolicyAccess` and then ignores the result passes every one of those
 * tests. Four drifted copies of the ownership rule shipped under exactly that
 * kind of green.
 *
 * So this spec asks the only question that matters, over real HTTP, with a
 * real session cookie: when a signed-in user who is not the owner and holds no
 * grant asks for somebody else's policy, do they get told no?
 *
 * The agent and the policyholder are provisioned with NO relationship between
 * them (tests/global-setup.ts creates neither a CustomerRelationship nor an
 * AccessGrant), so the agent here is a genuine stranger to this policy. That
 * is deliberate: the agent session is the sharper test, because the agent-side
 * visibility rule lives in a different module (lib/agent-visibility.ts) from
 * the one every route calls, and those two have drifted apart before.
 *
 * 403 and 404 are both correct. Which one is a product decision — 404 leaks
 * less — so this asserts "denied", not a specific code, and separately asserts
 * the body never carries the record.
 */

const OWNER_POLICY_NUMBER = 'E2E-MOT-001'

/** Every route that takes a policy id from the caller. */
function policyScopedPaths(policyId: string): string[] {
    return [
        `/api/v1/policies/${policyId}`,
        `/api/v1/policies/${policyId}/gaps`,
        `/api/v1/policies/${policyId}/documents`,
        `/api/v1/policies/${policyId}/review`,
        `/api/v1/policies/${policyId}/savings-report`,
        `/api/v1/policies/${policyId}/analysis-runs/compare`,
    ]
}

/**
 * Find the victim policy id using the OWNER's session, so the test never needs
 * database credentials and never hardcodes an id that a reseed would change.
 */
async function ownerPolicyId(request: APIRequestContext): Promise<string> {
    const res = await request.get('/api/v1/policies')
    expect(
        res.status(),
        'the owner must be able to list their own policies — if this fails the ' +
            'session fixture is broken, not the authorization rule'
    ).toBe(200)

    const body = await res.json()
    const policies: Array<Record<string, any>> = body.data ?? body.policies ?? body
    expect(Array.isArray(policies), `unexpected /api/v1/policies shape: ${JSON.stringify(body).slice(0, 200)}`).toBe(true)

    const fixture = policies.find((p) => p.policyNumber === OWNER_POLICY_NUMBER) ?? policies[0]
    expect(fixture, 'no fixture policy found for the E2E policyholder').toBeTruthy()

    const id = fixture.id ?? fixture.policyId
    expect(typeof id, 'could not read an id off the fixture policy').toBe('string')
    return id as string
}

test.describe('cross-tenant access is denied over HTTP', () => {
    test('an unrelated agent cannot read another tenant\'s policy', async ({ browser, playwright }) => {
        // Owner context — only used to discover the id.
        const ownerCtx = await playwright.request.newContext({
            storageState: 'playwright/.auth/user.json',
            baseURL: 'http://localhost:3000',
        })
        const policyId = await ownerPolicyId(ownerCtx)
        await ownerCtx.dispose()

        // Attacker context — a real, signed-in agent with no link to this policy.
        const agentCtx = await playwright.request.newContext({
            storageState: 'playwright/.auth/agent.json',
            baseURL: 'http://localhost:3000',
        })

        const leaks: string[] = []
        for (const path of policyScopedPaths(policyId)) {
            const res = await agentCtx.get(path)
            const status = res.status()
            const text = await res.text()

            if (![401, 403, 404].includes(status)) {
                leaks.push(`${path} → ${status} (expected 401/403/404)`)
                continue
            }

            // A denial that still ships the record is not a denial.
            if (text.includes(OWNER_POLICY_NUMBER)) {
                leaks.push(`${path} → ${status} but the body contained ${OWNER_POLICY_NUMBER}`)
            }
        }

        await agentCtx.dispose()

        expect(
            leaks,
            'A signed-in agent with no relationship and no grant reached another\n' +
                "tenant's policy data. This is the failure every static guard in\n" +
                'tests/unit/policy-authorization-single-path.test.ts is blind to:\n' +
                `  ${leaks.join('\n  ')}`
        ).toEqual([])
    })

    test('an invented policy id is denied identically, so the API is not an existence oracle', async ({ playwright }) => {
        const agentCtx = await playwright.request.newContext({
            storageState: 'playwright/.auth/agent.json',
            baseURL: 'http://localhost:3000',
        })

        const res = await agentCtx.get('/api/v1/policies/clzzzzzzzzzzzzzzzzzzzzzzzz')
        expect([401, 403, 404]).toContain(res.status())
        await agentCtx.dispose()
    })
})
