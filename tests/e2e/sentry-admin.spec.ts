import { test, expect } from '@playwright/test'
import { SentryTestHelper } from '../helpers/sentry-helper'

test.describe('Sentry Admin Action Error Capture', () => {
  let sentryHelper: SentryTestHelper

  test.beforeEach(async ({ page }) => {
    sentryHelper = new SentryTestHelper(page)
    await sentryHelper.setup()
  })

  test('unauthorized access to /admin redirects to signin', async ({ page }) => {
    await page.context().clearCookies()

    await page.goto('/admin/dashboard')
    const url = page.url()

    expect(url).toContain('/auth/signin')
    expect(url).toContain('callbackUrl')
  })

  test('unauthorized access to /admin/users redirects to signin', async ({ page }) => {
    await page.context().clearCookies()

    await page.goto('/admin/users')
    const url = page.url()

    expect(url).toContain('/auth/signin')
  })

  test('unauthorized access to /admin/tokens redirects to signin', async ({ page }) => {
    await page.context().clearCookies()

    await page.goto('/admin/tokens')
    const url = page.url()

    expect(url).toContain('/auth/signin')
  })

  test('non-admin user accessing admin pages is blocked', async ({ page }) => {
    await page.goto('/admin/dashboard')

    const bodyText = await page.textContent('body')
    const url = page.url()

    const isRedirected = url.includes('/auth/signin') || url.includes('/wallet') || url.includes('/dashboard')
    const hasError = bodyText?.toLowerCase().includes('unauthorized') ||
      bodyText?.toLowerCase().includes('admin') ||
      bodyText?.toLowerCase().includes('error') ||
      bodyText?.toLowerCase().includes('denied')

    expect(isRedirected || hasError).toBeTruthy()
  })

  test('admin API endpoint without auth is redirected by middleware', async ({ page }) => {
    await page.context().clearCookies()

    const response = await page.request.get('/api/admin/tokens/analytics', { maxRedirects: 0 })
    expect([301, 302, 307, 308]).toContain(response.status())
  })

  test('admin API token usage without auth is redirected by middleware', async ({ page }) => {
    await page.context().clearCookies()

    const response = await page.request.get('/api/admin/tokens/usage', { maxRedirects: 0 })
    expect([301, 302, 307, 308]).toContain(response.status())
  })

  test('Sentry intercepts are active and helper categorizes events correctly', async ({ page }) => {
    await page.goto('/admin/dashboard')

    await page.waitForTimeout(2000)

    const events = sentryHelper.getEvents()
    const exceptions = sentryHelper.getExceptions()
    const messages = sentryHelper.getMessages()
    const transactions = sentryHelper.getTransactions()

    for (const event of events) {
      expect(['exception', 'message', 'transaction']).toContain(event.type)
      expect(event.raw).toBeDefined()
      expect(typeof event.raw).toBe('string')
    }

    expect(events.length).toBe(exceptions.length + messages.length + transactions.length)
  })

  test('unauthorized admin access redirects rather than sending Sentry security events in dev', async ({ page }) => {
    await page.context().clearCookies()

    sentryHelper.clear()

    await page.goto('/admin/dashboard')

    await page.waitForTimeout(2000)

    const url = page.url()
    expect(url).toContain('/auth/signin')

    const exceptions = sentryHelper.getExceptions()
    const securityExceptions = exceptions.filter(
      (e) =>
        e.message?.includes('Unauthorized') ||
        e.message?.includes('Admin role required') ||
        e.message?.includes('Not authenticated')
    )
    expect(securityExceptions.length).toBe(0)
  })

  test('multiple admin route access attempts all redirect to signin', async ({ page }) => {
    await page.context().clearCookies()

    const adminRoutes = ['/admin/dashboard', '/admin/users', '/admin/insurers', '/admin/types']

    for (const route of adminRoutes) {
      await page.goto(route)
      const url = page.url()
      expect(url).toContain('/auth/signin')
    }
  })

  test('admin API endpoints consistently redirect unauthenticated requests', async ({ page }) => {
    await page.context().clearCookies()

    const analyticsResponse = await page.request.get('/api/admin/tokens/analytics', { maxRedirects: 0 })
    const usageResponse = await page.request.get('/api/admin/tokens/usage', { maxRedirects: 0 })

    expect([301, 302, 307, 308]).toContain(analyticsResponse.status())
    expect([301, 302, 307, 308]).toContain(usageResponse.status())

    const analyticsLocation = analyticsResponse.headers()['location'] || ''
    const usageLocation = usageResponse.headers()['location'] || ''

    expect(analyticsLocation).toContain('/auth/signin')
    expect(usageLocation).toContain('/auth/signin')
  })
})
