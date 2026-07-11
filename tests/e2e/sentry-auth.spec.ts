import { test, expect } from '@playwright/test'
import { SentryTestHelper } from '../helpers/sentry-helper'
import { dismissCookieBanner } from '../helpers/ui'

test.describe('Auth flow error capture', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('unauthenticated access to /wallet redirects to signin', async ({ page }) => {
    const sentry = new SentryTestHelper(page)
    await sentry.setup()

    await page.goto('/wallet')
    const url = page.url()

    expect(url).toContain('/auth/signin')
    expect(url).toContain('callbackUrl')
    expect(url).toContain(encodeURIComponent('/wallet'))
  })

  test('unauthenticated access to /admin redirects to signin', async ({ page }) => {
    const sentry = new SentryTestHelper(page)
    await sentry.setup()

    await page.goto('/admin/dashboard')
    const url = page.url()

    expect(url).toContain('/auth/signin')
    expect(url).toContain('callbackUrl')
  })

  test('unauthenticated access to /dashboard redirects to signin', async ({ page }) => {
    const sentry = new SentryTestHelper(page)
    await sentry.setup()

    await page.goto('/dashboard')
    const url = page.url()

    expect(url).toContain('/auth/signin')
  })

  test('invalid credentials show error on signin page', async ({ page }) => {
    const sentry = new SentryTestHelper(page)
    await sentry.setup()

    await page.goto('/auth/signin')
    await page.waitForSelector('input[type="email"]')
    await dismissCookieBanner(page)

    await page.fill('input[type="email"]', 'nonexistent@example.com')
    await page.fill('input[type="password"]', 'wrongpassword123')
    await page.click('button[type="submit"]')

    // Signin errors render in a rose-toned notice box (not red)
    const errorElement = page.locator('[class*="text-rose"], [class*="text-red"]').first()
    await expect(errorElement).toBeVisible({ timeout: 15000 })
  })

  test('invalid credentials do not produce Sentry events in dev mode', async ({ page }) => {
    const sentry = new SentryTestHelper(page)
    await sentry.setup()

    await page.goto('/auth/signin')
    await page.waitForSelector('input[type="email"]')
    await dismissCookieBanner(page)

    await page.fill('input[type="email"]', 'invalid@test.com')
    await page.fill('input[type="password"]', 'wrong')
    await page.click('button[type="submit"]')

    await page.waitForTimeout(5000)

    const exceptions = sentry.getExceptions()
    expect(exceptions.length).toBe(0)
  })

  test('public routes remain accessible without auth', async ({ page }) => {
    const publicRoutes = ['/', '/auth/signin', '/auth/signup', '/terms', '/privacy']

    for (const route of publicRoutes) {
      const response = await page.goto(route)
      const url = page.url()
      expect(url).not.toContain('/auth/signin?callbackUrl')
      expect(response?.status()).toBeLessThan(500)
    }
  })

  test('middleware preserves callback URL with query params', async ({ page }) => {
    await page.goto('/wallet?tab=policies&sort=date')
    const url = page.url()

    expect(url).toContain('/auth/signin')
    expect(url).toContain('callbackUrl')
    const callbackParam = new URL(url).searchParams.get('callbackUrl')
    expect(callbackParam).toContain('/wallet')
  })

  test('multiple protected routes all redirect correctly', async ({ page }) => {
    const protectedRoutes = ['/wallet', '/dashboard', '/account', '/notifications', '/tasks', '/insights']

    for (const route of protectedRoutes) {
      await page.goto(route)
      const url = page.url()
      expect(url).toContain('/auth/signin')
    }
  })
})
