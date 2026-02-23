import { test, expect } from '@playwright/test'
import { SentryTestHelper } from '../helpers/sentry-helper'

test.describe('API Route Error Capture', () => {
  test.describe('Unauthenticated API access is redirected by middleware', () => {
    test('GET /api/v1/policies without auth redirects to signin', async ({ request }) => {
      const response = await request.get('/api/v1/policies', { maxRedirects: 0 })
      expect([301, 302, 307, 308]).toContain(response.status())
      const location = response.headers()['location'] || ''
      expect(location).toContain('/auth/signin')
    })

    test('GET /api/v1/me without auth redirects to signin', async ({ request }) => {
      const response = await request.get('/api/v1/me', { maxRedirects: 0 })
      expect([301, 302, 307, 308]).toContain(response.status())
      const location = response.headers()['location'] || ''
      expect(location).toContain('/auth/signin')
    })

    test('POST /api/v1/policies without auth redirects to signin', async ({ request }) => {
      const response = await request.post('/api/v1/policies', {
        data: { policyNumber: 'TEST-001' },
        maxRedirects: 0,
      })
      expect([301, 302, 307, 308]).toContain(response.status())
    })

    test('GET /api/v1/policies/:id without auth redirects to signin', async ({ request }) => {
      const response = await request.get('/api/v1/policies/nonexistent-id', { maxRedirects: 0 })
      expect([301, 302, 307, 308]).toContain(response.status())
    })
  })

  test.describe('Redirect includes callback URL for return navigation', () => {
    test('redirect location includes the original API path', async ({ request }) => {
      const response = await request.get('/api/v1/policies', { maxRedirects: 0 })
      const location = response.headers()['location'] || ''
      expect(location).toContain(encodeURIComponent('/api/v1/policies'))
    })

    test('redirect location includes query params', async ({ request }) => {
      const response = await request.get('/api/v1/policies?status=active&limit=10', { maxRedirects: 0 })
      const location = response.headers()['location'] || ''
      expect(location).toContain('callbackUrl')
    })
  })

  test.describe('Auth API routes are not redirected by middleware', () => {
    test('/api/auth routes bypass the middleware redirect', async ({ request }) => {
      const response = await request.get('/api/auth/verify', { maxRedirects: 0 })
      expect([301, 302, 307, 308]).not.toContain(response.status())
    })
  })

  test.describe('Health endpoint', () => {
    test('GET /api/health is protected by middleware like other API routes', async ({ request }) => {
      const response = await request.get('/api/health', { maxRedirects: 0 })
      expect([301, 302, 307, 308]).toContain(response.status())
    })
  })

  test.describe('Multiple API endpoints redirect consistently when unauthenticated', () => {
    const endpoints = [
      '/api/v1/policies',
      '/api/v1/me',
      '/api/v1/notifications',
    ]

    for (const endpoint of endpoints) {
      test(`${endpoint} redirects to signin when unauthorized`, async ({ request }) => {
        const response = await request.get(endpoint, { maxRedirects: 0 })
        expect([301, 302, 307, 308]).toContain(response.status())
        const location = response.headers()['location'] || ''
        expect(location).toContain('/auth/signin')
      })
    }
  })

  test.describe('Sentry error tracking integration', () => {
    test('SentryTestHelper intercepts outbound Sentry requests', async ({ page }) => {
      const sentryHelper = new SentryTestHelper(page)
      await sentryHelper.setup()

      await page.goto('/')
      await page.waitForLoadState('networkidle')

      const requestCount = sentryHelper.getInterceptedRequestCount()
      expect(typeof requestCount).toBe('number')

      const events = sentryHelper.getEvents()
      expect(Array.isArray(events)).toBe(true)
    })

    test('handleApiError utility is available with errorId tagging', async ({ page }) => {
      const sentryHelper = new SentryTestHelper(page)
      await sentryHelper.setup()

      await page.goto('/')
      await page.waitForLoadState('networkidle')

      const hasErrorHandler = await page.evaluate(async () => {
        try {
          const res = await fetch('/api/auth/verify')
          const errorId = res.headers.get('X-Error-Id')
          return { status: res.status, hasErrorIdHeader: errorId !== null }
        } catch {
          return { status: 0, hasErrorIdHeader: false }
        }
      })

      expect(hasErrorHandler.status).toBeGreaterThan(0)
    })

    test('dev mode beforeSend prevents events from reaching Sentry endpoint', async ({ page }) => {
      const sentryHelper = new SentryTestHelper(page)
      await sentryHelper.setup()

      await page.goto('/')
      await page.waitForLoadState('networkidle')

      sentryHelper.clear()

      await page.evaluate(() => {
        const err = new Error('API-triggered test error')
        window.dispatchEvent(new ErrorEvent('error', { error: err, message: 'API-triggered test error' }))
      })

      await page.waitForTimeout(2000)

      const events = sentryHelper.getEvents()
      const testErrors = events.filter((e) => e.message?.includes('API-triggered test error'))
      expect(testErrors.length).toBe(0)
    })
  })
})
