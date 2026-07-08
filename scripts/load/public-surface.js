// k6 load scenario — public surface + the public consents endpoint.
// Run against STAGING only, never production:
//   BASE_URL=https://<staging> k6 run scripts/load/public-surface.js
//
// Covers the unauthenticated hot paths a launch spike hits first: landing,
// pricing, product pages, health, and the rate-limited public consents POST.
// Authenticated journeys (wallet, upload+analysis, checkout) need seeded
// session tokens — see scripts/load/README.md to extend this with a login flow.
import http from 'k6/http'
import { check, sleep, group } from 'k6'
import { Rate } from 'k6/metrics'

const errors = new Rate('failed_requests')
const BASE = __ENV.BASE_URL || 'http://localhost:3000'

export const options = {
    scenarios: {
        // Ramp to a sustained browse load, then a short spike.
        browse: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '30s', target: 20 },
                { duration: '1m', target: 20 },
                { duration: '30s', target: 60 }, // spike
                { duration: '30s', target: 0 },
            ],
        },
    },
    thresholds: {
        // p95 under 500ms for reads; keep failures under 1%.
        http_req_duration: ['p(95)<500'],
        failed_requests: ['rate<0.01'],
    },
}

const PAGES = ['/', '/en', '/pricing', '/product', '/for-agents', '/api/health']

export default function () {
    group('marketing + health', () => {
        for (const path of PAGES) {
            const res = http.get(`${BASE}${path}`)
            const ok = check(res, { [`${path} 200`]: (r) => r.status === 200 })
            errors.add(!ok)
        }
    })

    group('public consent write (rate-limited)', () => {
        const res = http.post(
            `${BASE}/api/v1/consents`,
            JSON.stringify({ consentType: 'cookie', locale: 'el', source: 'loadtest' }),
            { headers: { 'Content-Type': 'application/json' } }
        )
        // 200 (recorded) or 429 (rate-limited) are both healthy under load.
        const ok = check(res, { 'consents 200/429': (r) => r.status === 200 || r.status === 429 })
        errors.add(!ok)
    })

    sleep(1)
}
