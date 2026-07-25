import { describe, it, expect } from 'vitest'
import { existsSync } from 'node:fs'

/**
 * Every data-heavy authenticated route must ship a loading.tsx, so a slow
 * server render shows a skeleton rather than a blank/frozen screen. coverage-
 * insights was the one gap — a multi-await page (auth, entitlements, gap-engine
 * snapshot) with no loading state while every sibling had one.
 */
const DATA_ROUTES = [
    'coverage-insights',
    'dashboard',
    'dashboard/agent',
    'wallet',
    'wallet/[id]',
    'insights',
    'renewals',
    'opportunities',
    'customers',
    'activity',
    'commissions',
    'tasks',
    'team',
    'questionnaires',
]

describe('data-heavy protected routes ship a loading state', () => {
    it('every listed route has a loading.tsx', () => {
        const missing = DATA_ROUTES.filter(
            (r) => !existsSync(`app/(protected)/${r}/loading.tsx`),
        )
        expect(missing, `routes missing loading.tsx (blank flash on slow load):\n${missing.join('\n')}`).toEqual([])
    })

    it('every listed route has an error.tsx (a throw is contained + retryable, not shell-wide)', () => {
        const missing = DATA_ROUTES.filter(
            (r) => !existsSync(`app/(protected)/${r}/error.tsx`),
        )
        expect(missing, `routes missing error.tsx (a query failure tears down the whole shell):\n${missing.join('\n')}`).toEqual([])
    })
})
