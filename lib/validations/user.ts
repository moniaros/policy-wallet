/**
 * User Validation Schemas
 * 
 * Zod schemas for validating user-related inputs
 */

import { z } from 'zod'

// Email validation
const emailSchema = z.string()
    .email('Invalid email address')
    .toLowerCase()
    .trim()

// Password validation
const passwordSchema = z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password too long')
    .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    )

// Update user profile schema
export const updateUserProfileSchema = z.object({
    name: z.string()
        .min(1, 'Name is required')
        .max(200, 'Name too long')
        .trim()
        .optional(),

    email: emailSchema.optional(),

    phone: z.string()
        .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
        .optional()
        .nullable(),

    preferredLanguage: z.enum(['en', 'el'])
        .optional(),

    image: z.string()
        .url('Invalid image URL')
        .optional()
        .nullable(),
})

// Change password schema
export const changePasswordSchema = z.object({
    currentPassword: z.string()
        .min(1, 'Current password is required'),

    newPassword: passwordSchema,

    confirmPassword: z.string()
        .min(1, 'Password confirmation is required'),
})
    .refine(
        (data) => data.newPassword === data.confirmPassword,
        {
            message: 'Passwords do not match',
            path: ['confirmPassword']
        }
    )
    .refine(
        (data) => data.currentPassword !== data.newPassword,
        {
            message: 'New password must be different from current password',
            path: ['newPassword']
        }
    )

// Notification preferences schema
export const notificationPreferencesSchema = z.object({
    emailNotifications: z.boolean().default(true),
    policyExpiry: z.boolean().default(true),
    gapDetection: z.boolean().default(true),
    agentMessages: z.boolean().default(true),
    marketingEmails: z.boolean().default(false),
})

// Export types
export type UpdateUserProfileInput = z.infer<typeof updateUserProfileSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
export type NotificationPreferencesInput = z.infer<typeof notificationPreferencesSchema>
