import { describe, expect, it } from 'vitest'

import { isAgentRole } from '@/lib/auth/require-agent'

describe('isAgentRole — agent server-action gate', () => {
    it('accepts agents and admins', () => {
        expect(isAgentRole('agent')).toBe(true)
        expect(isAgentRole('admin')).toBe(true)
        expect(isAgentRole('policyholder,agent')).toBe(true)
        expect(isAgentRole('agent,agent_pro')).toBe(true)
    })

    it('rejects a plain policyholder — cannot act as their own agent', () => {
        expect(isAgentRole('policyholder')).toBe(false)
        expect(isAgentRole('')).toBe(false)
        expect(isAgentRole(null)).toBe(false)
        expect(isAgentRole(undefined)).toBe(false)
    })

    it('is not fooled by a substring ("agentx" is not "agent")', () => {
        expect(isAgentRole('agentx')).toBe(false)
    })
})
