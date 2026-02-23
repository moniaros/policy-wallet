import { Page, Request } from '@playwright/test'

interface SentryEvent {
  type: 'exception' | 'message' | 'transaction' | 'unknown'
  message?: string
  tags?: Record<string, string>
  level?: string
  environment?: string
  raw: string
}

export class SentryTestHelper {
  private events: SentryEvent[] = []
  private interceptedRequests: Request[] = []

  constructor(private page: Page) {}

  async setup(): Promise<void> {
    this.events = []
    this.interceptedRequests = []

    await this.page.route('**/monitoring**', async (route) => {
      const request = route.request()
      this.interceptedRequests.push(request)

      const body = request.postData() || ''
      this.parseEnvelope(body)

      await route.fulfill({ status: 200, body: '{}' })
    })

    await this.page.route('**/*.sentry.io/**', async (route) => {
      const request = route.request()
      this.interceptedRequests.push(request)

      const body = request.postData() || ''
      this.parseEnvelope(body)

      await route.fulfill({ status: 200, body: '{}' })
    })
  }

  private parseEnvelope(body: string): void {
    const lines = body.split('\n').filter(Boolean)
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line)
        if (parsed.sent_at || parsed.sdk || (parsed.type && !parsed.exception && !parsed.message && !parsed.transaction)) {
          continue
        }
        const event = this.extractEvent(parsed)
        if (event) {
          this.events.push(event)
        }
      } catch {
      }
    }
  }

  private extractEvent(data: Record<string, unknown>): SentryEvent | null {
    if (data.exception) {
      const exception = data.exception as { values?: Array<{ type?: string; value?: string }> }
      const firstValue = exception.values?.[0]
      return {
        type: 'exception',
        message: firstValue?.value || firstValue?.type || 'Unknown exception',
        tags: data.tags as Record<string, string> | undefined,
        level: data.level as string | undefined,
        environment: data.environment as string | undefined,
        raw: JSON.stringify(data),
      }
    }

    if (data.message) {
      const msg = typeof data.message === 'string'
        ? data.message
        : (data.message as { formatted?: string })?.formatted || JSON.stringify(data.message)
      return {
        type: 'message',
        message: msg,
        tags: data.tags as Record<string, string> | undefined,
        level: data.level as string | undefined,
        environment: data.environment as string | undefined,
        raw: JSON.stringify(data),
      }
    }

    if (data.type === 'transaction' || data.transaction) {
      return {
        type: 'transaction',
        message: data.transaction as string | undefined,
        tags: data.tags as Record<string, string> | undefined,
        level: data.level as string | undefined,
        environment: data.environment as string | undefined,
        raw: JSON.stringify(data),
      }
    }

    return null
  }

  getEvents(): SentryEvent[] {
    return [...this.events]
  }

  getExceptions(): SentryEvent[] {
    return this.events.filter((e) => e.type === 'exception')
  }

  getMessages(): SentryEvent[] {
    return this.events.filter((e) => e.type === 'message')
  }

  getTransactions(): SentryEvent[] {
    return this.events.filter((e) => e.type === 'transaction')
  }

  getInterceptedRequestCount(): number {
    return this.interceptedRequests.length
  }

  hasException(messagePattern: string | RegExp): boolean {
    return this.getExceptions().some((e) => {
      if (typeof messagePattern === 'string') {
        return e.message?.includes(messagePattern)
      }
      return messagePattern.test(e.message || '')
    })
  }

  hasMessage(messagePattern: string | RegExp): boolean {
    return this.getMessages().some((e) => {
      if (typeof messagePattern === 'string') {
        return e.message?.includes(messagePattern)
      }
      return messagePattern.test(e.message || '')
    })
  }

  hasEventWithTag(tagKey: string, tagValue?: string): boolean {
    return this.events.some((e) => {
      if (!e.tags) return false
      if (tagValue !== undefined) {
        return e.tags[tagKey] === tagValue
      }
      return tagKey in e.tags
    })
  }

  findEventsWithTag(tagKey: string): SentryEvent[] {
    return this.events.filter((e) => e.tags && tagKey in e.tags)
  }

  clear(): void {
    this.events = []
    this.interceptedRequests = []
  }

  async waitForEvents(count: number, timeoutMs = 5000): Promise<SentryEvent[]> {
    const start = Date.now()
    while (this.events.length < count && Date.now() - start < timeoutMs) {
      await this.page.waitForTimeout(200)
    }
    return this.getEvents()
  }
}
