/**
 * An agent adding a customer must never create a unilaterally-'active'
 * relationship: being an activated PlatformUser is not consent to THIS agent, and
 * 'active' both misrepresents the person in the UI ("activated") and inflates the
 * agent's activation stats. Every manual add starts 'pending_activation'; only the
 * customer accepting (redeemInviteCode / invite signup) makes it 'active'.
 */
import { describe, it, expect, vi } from 'vitest'
import { CustomerService } from '@/lib/services/customer.service'

const relCreate = () => vi.fn(async (args: any) => ({ id: 'rel-1', ...args.data }))

describe('CustomerService.createCustomer — never unilaterally active', () => {
    it("marks a manually-added, already-activated real account 'pending_activation'", async () => {
        const create = relCreate()
        const db = {
            user: {
                findUnique: vi.fn(async () => ({
                    id: 'cust-1',
                    email: 'real@x.com',
                    taxId: 'existing',
                    password: null,
                    emailVerified: new Date(),
                    lastActiveAt: new Date(),
                })),
                update: vi.fn(),
            },
            customerRelationship: { findUnique: vi.fn(async () => null), create },
            activityLog: { create: vi.fn(async () => ({})) },
        }
        const svc = new CustomerService(db as any)

        await svc.createCustomer('agent-1', { email: 'real@x.com', name: 'Real User' } as any)

        expect(create).toHaveBeenCalledTimes(1)
        expect(create.mock.calls[0]![0].data.status).toBe('pending_activation')
    })

    it("marks a freshly-created phantom 'pending_activation' too", async () => {
        const create = relCreate()
        const db = {
            user: {
                findUnique: vi.fn(async () => null),
                create: vi.fn(async () => ({
                    id: 'phantom-1',
                    email: 'p@x.com',
                    taxId: null,
                    password: null,
                    emailVerified: null,
                })),
                update: vi.fn(),
            },
            customerRelationship: { findUnique: vi.fn(async () => null), create },
            activityLog: { create: vi.fn(async () => ({})) },
        }
        const svc = new CustomerService(db as any)

        await svc.createCustomer('agent-1', { email: 'p@x.com', name: 'Phantom' } as any)

        expect(create.mock.calls[0]![0].data.status).toBe('pending_activation')
    })
})
