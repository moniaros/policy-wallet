/**
 * Policy Validation Schemas
 * 
 * Zod schemas for validating policy-related inputs
 */

import { z } from 'zod'

import { WRITE_BRANCH_IDS } from '@/lib/insurance/taxonomy'

// Valid lines of business — vocabulary owned by the canonical taxonomy
// (tests assert it stays a superset of the pre-taxonomy 9-value enum)
export const lineOfBusinessEnum = z.enum(WRITE_BRANCH_IDS)

// Policy status enum
export const policyStatusEnum = z.enum([
    'active',
    'pending',
    'cancelled',
    'expired',
    'lapsed'
])

// Create policy schema
export const createPolicySchema = z.object({
    policyNumber: z.string()
        .min(1, 'Policy number is required')
        .max(100, 'Policy number too long')
        .trim(),

    insurerName: z.string()
        .min(1, 'Insurer name is required')
        .max(200, 'Insurer name too long')
        .trim(),

    lineOfBusiness: lineOfBusinessEnum,

    startDate: z.string()
        .datetime('Invalid start date format'),

    endDate: z.string()
        .datetime('Invalid end date format'),

    premium: z.number()
        .positive('Premium must be positive')
        .optional(),

    coverageSummary: z.string()
        .max(5000, 'Coverage summary too long')
        .optional(),

    status: policyStatusEnum
        .default('active'),
})

// Update policy schema (all fields optional, no refinements for partial updates)
export const updatePolicySchema = z.object({
    policyNumber: z.string()
        .min(1, 'Policy number is required')
        .max(100, 'Policy number too long')
        .trim()
        .optional(),

    insurerName: z.string()
        .min(1, 'Insurer name is required')
        .max(200, 'Insurer name too long')
        .trim()
        .optional(),

    lineOfBusiness: lineOfBusinessEnum.optional(),

    startDate: z.string()
        .datetime('Invalid start date format')
        .optional(),

    endDate: z.string()
        .datetime('Invalid end date format')
        .optional(),

    premium: z.number()
        .positive('Premium must be positive')
        .optional(),

    coverageSummary: z.string()
        .max(5000, 'Coverage summary too long')
        .optional(),

    status: policyStatusEnum.optional(),
})

// Policy document upload schema
export const uploadPolicyDocumentSchema = z.object({
    policyId: z.string()
        .cuid('Invalid policy ID'),

    fileName: z.string()
        .min(1, 'File name is required')
        .max(255, 'File name too long'),

    fileSize: z.number()
        .positive('File size must be positive')
        .max(10 * 1024 * 1024, 'File size must be less than 10MB'),

    mimeType: z.enum([
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/jpg'
    ])
})

// Export types
export type CreatePolicyInput = z.infer<typeof createPolicySchema>
export type UpdatePolicyInput = z.infer<typeof updatePolicySchema>
export type UploadPolicyDocumentInput = z.infer<typeof uploadPolicyDocumentSchema>
export type LineOfBusiness = z.infer<typeof lineOfBusinessEnum>
export type PolicyStatus = z.infer<typeof policyStatusEnum>
