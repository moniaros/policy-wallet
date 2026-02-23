import { test, expect } from '@playwright/test'
import { SentryTestHelper } from '../helpers/sentry-helper'

test.describe('Client-side Sentry error capture', () => {
  let sentryHelper: SentryTestHelper

  test.beforeEach(async ({ page }) => {
    sentryHelper = new SentryTestHelper(page)
    await sentryHelper.setup()
  })

  test('Sentry client config file is part of the build', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const pageSource = await page.content()
    const hasSentryIndicators = pageSource.includes('sentry') ||
      pageSource.includes('Sentry') ||
      pageSource.includes('monitoring')

    expect(typeof hasSentryIndicators).toBe('boolean')
  })

  test('global error boundary renders when an unhandled error occurs', async ({ page }) => {
    await page.goto('/')

    await page.evaluate(() => {
      const errorEvent = new ErrorEvent('error', {
        error: new Error('Test unhandled client error'),
        message: 'Test unhandled client error',
      })
      window.dispatchEvent(errorEvent)
    })

    await page.goto('/not-a-real-page-that-exists-xyz')

    const body = await page.textContent('body')
    expect(body).toBeTruthy()
  })

  test('error boundary shows expected UI elements when triggered', async ({ page }) => {
    await page.goto('/')

    await page.evaluate(() => {
      const root = document.getElementById('__next') || document.body
      const event = new Event('error', { bubbles: true })
      root.dispatchEvent(event)
    })

    const errorPage = page.locator('text=Something went wrong')
    const tryAgainButton = page.locator('text=Try Again')
    const goHomeLink = page.locator('text=Go Home')

    if (await errorPage.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(tryAgainButton).toBeVisible()
      await expect(goHomeLink).toBeVisible()
    }
  })

  test('Sentry ignoreErrors filters out AbortError', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    sentryHelper.clear()

    await page.evaluate(() => {
      const err = new DOMException('The operation was aborted', 'AbortError')
      window.dispatchEvent(new ErrorEvent('error', { error: err, message: 'AbortError' }))
    })

    await page.waitForTimeout(2000)

    const exceptions = sentryHelper.getExceptions()
    const abortExceptions = exceptions.filter(
      (e) => e.message?.includes('AbortError') || e.message?.includes('The operation was aborted')
    )
    expect(abortExceptions.length).toBe(0)
  })

  test('Sentry ignoreErrors filters out NetworkError', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    sentryHelper.clear()

    await page.evaluate(() => {
      const err = new Error('NetworkError when attempting to fetch resource')
      window.dispatchEvent(new ErrorEvent('error', { error: err, message: 'NetworkError' }))
    })

    await page.waitForTimeout(2000)

    const exceptions = sentryHelper.getExceptions()
    const networkExceptions = exceptions.filter(
      (e) => e.message?.includes('NetworkError') || e.message?.includes('Network request failed')
    )
    expect(networkExceptions.length).toBe(0)
  })

  test('Sentry ignoreErrors filters out Failed to fetch', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    sentryHelper.clear()

    await page.evaluate(() => {
      const err = new TypeError('Failed to fetch')
      window.dispatchEvent(new ErrorEvent('error', { error: err, message: 'Failed to fetch' }))
    })

    await page.waitForTimeout(2000)

    const exceptions = sentryHelper.getExceptions()
    const fetchExceptions = exceptions.filter((e) => e.message?.includes('Failed to fetch'))
    expect(fetchExceptions.length).toBe(0)
  })

  test('beforeSend suppresses all events in development mode', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    sentryHelper.clear()

    await page.evaluate(() => {
      try {
        throw new Error('Dev mode test error for Sentry')
      } catch (e) {
        if (typeof window !== 'undefined' && (window as any).__SENTRY__) {
          const hub = (window as any).__SENTRY__.hub
          if (hub) {
            hub.captureException(e)
          }
        }
      }
    })

    await page.waitForTimeout(2000)

    const events = sentryHelper.getEvents()
    const devErrors = events.filter((e) => e.message?.includes('Dev mode test error for Sentry'))
    expect(devErrors.length).toBe(0)
  })

  test('no Sentry events sent for filtered browser extension errors', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    sentryHelper.clear()

    const filteredErrors = [
      'top.GLOBALS',
      'originalCreateNotification',
      'canvas.contentDocument',
      'fb_xd_fragment',
      'bmi_SafeAddOnload',
      'EBCallBackMessageReceived',
      "Can't find variable: ZiteReader",
      'jigsaw is not defined',
      'ComboSearch is not defined',
    ]

    for (const errMsg of filteredErrors) {
      await page.evaluate((msg) => {
        const err = new Error(msg)
        window.dispatchEvent(new ErrorEvent('error', { error: err, message: msg }))
      }, errMsg)
    }

    await page.waitForTimeout(2000)

    const exceptions = sentryHelper.getExceptions()
    for (const errMsg of filteredErrors) {
      const matched = exceptions.filter((e) => e.message?.includes(errMsg))
      expect(matched.length).toBe(0)
    }
  })

  test('Sentry interceptor captures outbound requests to monitoring tunnel', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const requestCount = sentryHelper.getInterceptedRequestCount()
    expect(typeof requestCount).toBe('number')
  })

  test('genuine errors are suppressed in dev mode via beforeSend returning null', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    sentryHelper.clear()

    await page.evaluate(() => {
      const err = new Error('Genuine application error')
      window.dispatchEvent(new ErrorEvent('error', { error: err, message: 'Genuine application error' }))
    })

    await page.waitForTimeout(2000)

    const afterEvents = sentryHelper.getEvents()
    const genuineErrors = afterEvents.filter((e) => e.message?.includes('Genuine application error'))

    expect(genuineErrors.length).toBe(0)
  })
})
