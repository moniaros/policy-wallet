import { vi } from "vitest"

/**
 * The db surface `emit` touches, for tests that exercise code which notifies.
 *
 * Every notification now goes through one bus, so any test of a service that
 * emits needs these four models mocked. Spreading a shared factory keeps that
 * from being re-derived (and mis-derived) in a dozen `vi.mock('@/lib/db')`
 * factories — and means adding a lookup to the dispatcher is one edit here
 * rather than a dozen failing suites.
 *
 * Defaults are the boring path: recipient exists, prefers English, has no
 * preferences set (so nothing is suppressed) and no prior row with this dedupe
 * key. Override per test where the point is the exception.
 *
 *     vi.mock('@/lib/db', () => ({ db: { ...notificationDbMock(), policy: … } }))
 */
export function notificationDbMock() {
    return {
        notificationEvent: {
            create: vi.fn(async () => ({})),
            findFirst: vi.fn(async () => null),
            // Takes the query args so a test can route on `where` (the retry
            // sweep issues three differently-shaped findMany calls, and the
            // cadence month-count a fourth).
            findMany: vi.fn(async (_args?: unknown) => [] as any[]),
            update: vi.fn(async () => ({})),
            updateMany: vi.fn(async () => ({ count: 0 })),
            count: vi.fn(async () => 0),
        },
        notificationPreference: {
            findMany: vi.fn(async () => []),
            findUnique: vi.fn(async () => null),
            upsert: vi.fn(async () => ({})),
        },
        user: {
            findUnique: vi.fn(async () => ({
                email: "recipient@example.com",
                preferredLanguage: "en",
            })),
        },
        // The admin override layer. Empty = registry defaults, which is what a
        // test asserting shipped behaviour wants.
        notificationRuleOverride: {
            findMany: vi.fn(async () => []),
            findUnique: vi.fn(async () => null),
            upsert: vi.fn(async () => ({})),
        },
        notificationSetting: {
            findMany: vi.fn(async () => []),
            upsert: vi.fn(async () => ({})),
        },
        notificationTemplate: {
            findMany: vi.fn(async () => []),
            findUnique: vi.fn(async () => null),
        },
        pushDevice: {
            findMany: vi.fn(async () => []),
            deleteMany: vi.fn(async () => ({ count: 0 })),
            updateMany: vi.fn(async () => ({ count: 0 })),
        },
        // The §9.5 cadence gate (lib/notifications/cadence.ts). Null = the user
        // never touched the controls, so nothing is off and no ceiling applies —
        // the boring path, matching every other default here.
        userNotificationSettings: {
            findUnique: vi.fn(async () => null),
            upsert: vi.fn(async () => ({})),
        },
        policyholderProfile: {
            findUnique: vi.fn(async () => null),
        },
    }
}
