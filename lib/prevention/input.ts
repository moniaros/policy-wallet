import { z } from 'zod'
import { BARRIERS } from './types'
export const ProgressInput = z.object({
    policyId: z.string().min(1).max(100), itemKey: z.string().min(1).max(250), sourceVersion: z.string().min(1).max(100),
    choice: z.enum(['planned', 'done', 'later', 'dismissed', 'clear']),
    remindAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    knowsProcedure: z.boolean().nullable().optional(), plannedFor: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    healthConsent: z.boolean().optional(), barrier: z.enum(BARRIERS).nullable().optional(), helpful: z.boolean().nullable().optional(),
}).strict()
export const CheckInInput = z.object({ consent: z.literal(true), answers: z.object({
    activityDays: z.number().int().min(0).max(7).optional(),
    activityMinutes: z.number().int().min(0).max(10080).optional(),
    smoking: z.enum(['never', 'former', 'current']).optional(),
    smokingSupport: z.boolean().optional(),
    bloodPressure: z.enum(['remember', 'not_sure', 'never']).optional(),
}).strict().refine(a => Object.keys(a).length > 0) }).strict()
export function validReminderDate(value: string | undefined, window: { min: string; max: string }): boolean {
    if (!value || value < window.min || value > window.max) return false
    const date = new Date(`${value}T00:00:00Z`)
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export const BenefitUseInput = z.object({ policyId: z.string().min(1).max(100), itemKey: z.string().min(1).max(250), sourceVersion: z.string().min(1).max(100), periodKey: z.string().min(1).max(100), status: z.enum(['used', 'not_used', 'unknown', 'clear']), usedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), healthConsent: z.boolean().optional() }).strict()
