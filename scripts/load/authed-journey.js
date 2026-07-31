// k6 load scenario — the authenticated journey, at the 50–100K profile.
//
//   BASE_URL=https://<staging> \
//   SUPABASE_URL=https://<ref>.supabase.co \
//   SUPABASE_ANON_KEY=<anon> \
//   LOAD_USERS='u1@example.com:pw,u2@example.com:pw' \
//   k6 run scripts/load/authed-journey.js
//
// `public-surface.js` covers what a launch spike hits first. This covers what
// costs money to serve: the wallet list, a policy read with its gaps, and the
// portfolio score — the three reads behind every session — plus, only when
// explicitly asked for, the analysis enqueue.
//
// Two things this script refuses to do, because both have happened to real
// teams and neither is recoverable by apologising afterwards:
//
//   1. **Run against production.** A load test is indistinguishable from an
//      attack, and this one writes. The guard is a denylist of the production
//      hosts plus an explicit I_KNOW override that is deliberately awkward.
//   2. **Spend the AI budget.** Triggering analysis on a staging environment
//      pointed at a real provider bills real tokens per virtual user, per
//      iteration. Enqueue is off unless ENABLE_ANALYSIS=1, and even then the
//      target must report the mock provider.
//
// And one it refuses to pass: a run whose logins all failed. Every request
// would 401 — fast, uniform, and under any error threshold that only looks for
// 5xx. `setup()` aborts rather than let a green run mean "we load-tested the
// sign-in wall".
import http from 'k6/http'
import { check, sleep, group, fail } from 'k6'
import { Rate, Trend } from 'k6/metrics'

const errors = new Rate('failed_requests')
const readLatency = new Trend('read_latency', true)
const enqueueLatency = new Trend('enqueue_latency', true)

const BASE = __ENV.BASE_URL || 'http://localhost:3000'
const SUPABASE_URL = __ENV.SUPABASE_URL || ''
const SUPABASE_ANON_KEY = __ENV.SUPABASE_ANON_KEY || ''
const ENABLE_ANALYSIS = __ENV.ENABLE_ANALYSIS === '1'

/** Hosts this must never be pointed at. */
const PRODUCTION_HOSTS = ['policywallet.gr', 'www.policywallet.gr', 'app.policywallet.gr']

export const options = {
    scenarios: {
        // The 50–100K profile: most sessions are reads, a minority upload.
        // Sustained rather than spiky — the failure this is looking for is
        // connection-pool exhaustion and rate-limiter drift under steady load,
        // not the burst behaviour public-surface.js already covers.
        journey: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '1m', target: 25 },
                { duration: '3m', target: 50 },
                { duration: '1m', target: 100 }, // peak-hour approximation
                { duration: '1m', target: 0 },
            ],
        },
    },
    thresholds: {
        // Per-operation, not one global number: a fast read average would
        // otherwise hide a slow enqueue, which is the thing most likely to
        // break first. Targets from the plan's KPI gate.
        read_latency: ['p(95)<500'],
        enqueue_latency: ['p(95)<2000'],
        failed_requests: ['rate<0.01'],
    },
}

function parseUsers() {
    return (__ENV.LOAD_USERS || '')
        .split(',')
        .map((pair) => pair.trim())
        .filter(Boolean)
        .map((pair) => {
            const idx = pair.lastIndexOf(':')
            return { email: pair.slice(0, idx), password: pair.slice(idx + 1) }
        })
        .filter((u) => u.email && u.password)
}

function assertNotProduction() {
    const host = BASE.replace(/^https?:\/\//, '').split('/')[0].split(':')[0]
    if (PRODUCTION_HOSTS.includes(host) && __ENV.I_KNOW_THIS_IS_PRODUCTION !== 'yes-really') {
        fail(
            `Refusing to load-test ${host}: this is production and this scenario writes. ` +
            'Point BASE_URL at staging.'
        )
    }
}

/**
 * Refuse to enqueue analyses against a real provider.
 *
 * Reads the target's own health output rather than trusting the operator's
 * memory of which key is set in which environment — the person running a load
 * test is rarely the person who configured staging last.
 */
function assertMockProvider() {
    const res = http.get(`${BASE}/api/health`)
    const isMock = res.json('services.aiProviderIsMock')

    if (isMock === false) {
        fail(
            'ENABLE_ANALYSIS=1 but the target is running a REAL AI provider. Each ' +
            'virtual user would bill real tokens on every iteration. Point staging ' +
            'at the mock provider (AI_SERVICE_TYPE=mock) first.'
        )
    }
    if (typeof isMock !== 'boolean') {
        // Older deployment, or /api/health unreachable. Unknown is not safe:
        // the whole point is not to find out by reading the invoice.
        fail(
            'ENABLE_ANALYSIS=1 but the target does not report services.aiProviderIsMock, ' +
            'so this cannot verify the spend is bounded. Refusing to enqueue.'
        )
    }
}

export function setup() {
    assertNotProduction()

    const users = parseUsers()
    if (users.length === 0) {
        fail('LOAD_USERS is empty. Seed staging users first — see scripts/load/README.md.')
    }
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        fail('SUPABASE_URL and SUPABASE_ANON_KEY are required to obtain session tokens.')
    }

    const tokens = []
    for (const user of users) {
        const res = http.post(
            `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
            JSON.stringify({ email: user.email, password: user.password }),
            { headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY } }
        )
        const token = res.json('access_token')
        if (token) tokens.push(token)
        else console.warn(`login failed for ${user.email}: ${res.status}`)
    }

    // The vacuity floor. With no tokens every request 401s: uniform, fast, and
    // invisible to a threshold that only counts 5xx — a green run that measured
    // the sign-in wall and nothing else.
    if (tokens.length === 0) {
        fail('No user authenticated. Every request would 401 and the run would pass while measuring nothing.')
    }
    if (tokens.length < users.length) {
        console.warn(`only ${tokens.length}/${users.length} users authenticated`)
    }

    if (ENABLE_ANALYSIS) assertMockProvider()

    return { tokens }
}

function authedGet(path, token, tag) {
    const res = http.get(`${BASE}${path}`, {
        headers: { Authorization: `Bearer ${token}` },
        tags: { op: tag },
    })
    // 200 only. Accepting "< 500" would count the 401s this script exists to
    // avoid measuring, and 429 on a read means the limiter is misconfigured for
    // this load, which is a finding rather than a pass.
    const ok = check(res, { [`${tag} 200`]: (r) => r.status === 200 })
    errors.add(!ok)
    readLatency.add(res.timings.duration)
    return res
}

export default function (data) {
    const token = data.tokens[__VU % data.tokens.length]

    group('session reads', () => {
        authedGet('/api/v1/me', token, 'me')
        const policies = authedGet('/api/v1/policies', token, 'policy-list')
        authedGet('/api/v1/protection-score', token, 'protection-score')

        // Detail read on whatever this user actually holds, rather than a
        // hardcoded id that would 404 uniformly and look fast.
        const list = policies.json('data.policies') || policies.json('data') || []
        const first = Array.isArray(list) && list.length > 0 ? list[0] : null
        if (first && first.id) {
            authedGet(`/api/v1/policies/${first.id}`, token, 'policy-detail')
            authedGet(`/api/v1/policies/${first.id}/gaps`, token, 'policy-gaps')
        }
    })

    if (ENABLE_ANALYSIS) {
        group('analysis enqueue', () => {
            const policies = http.get(`${BASE}/api/v1/policies`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            const list = policies.json('data.policies') || policies.json('data') || []
            const first = Array.isArray(list) && list.length > 0 ? list[0] : null
            if (!first || !first.id) return

            const res = http.post(
                `${BASE}/api/v1/policies/${first.id}/review`,
                JSON.stringify({}),
                {
                    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                    tags: { op: 'analysis-enqueue' },
                }
            )
            // This measures the ENQUEUE, not the run. 202/200 mean accepted;
            // 429 means the per-user analysis limiter held, which is the
            // correct behaviour under this load and not a failure.
            const ok = check(res, {
                'enqueue accepted or throttled': (r) => [200, 202, 429].includes(r.status),
            })
            errors.add(!ok)
            enqueueLatency.add(res.timings.duration)
        })
    }

    sleep(1)
}
