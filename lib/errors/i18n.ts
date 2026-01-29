/**
 * Internationalization (i18n) Support for Error Messages
 * 
 * Provides multilingual error messages for Greek and English
 */

import type { Language } from '@/types'

export interface I18nErrorMessages {
    unauthorized: string
    forbidden: string
    notFound: (resource: string) => string
    validationFailed: string
    conflict: string
    rateLimited: (retryAfter?: number) => string
    externalService: (service: string) => string
    internalError: string
}

const errorMessages: Record<Language, I18nErrorMessages> = {
    en: {
        unauthorized: 'You must be logged in to perform this action',
        forbidden: 'You do not have permission to perform this action',
        notFound: (resource: string) => `${resource} not found`,
        validationFailed: 'Validation failed',
        conflict: 'This operation conflicts with existing data',
        rateLimited: (retryAfter?: number) =>
            retryAfter
                ? `Too many requests. Please try again in ${retryAfter} seconds.`
                : 'Too many requests. Please try again later.',
        externalService: (service: string) =>
            `The ${service} service is currently unavailable. Please try again later.`,
        internalError: 'An unexpected error occurred. Our team has been notified.'
    },
    el: {
        unauthorized: 'Πρέπει να συνδεθείτε για να εκτελέσετε αυτήν την ενέργεια',
        forbidden: 'Δεν έχετε δικαίωμα να εκτελέσετε αυτήν την ενέργεια',
        notFound: (resource: string) => `Δεν βρέθηκε ${resource}`,
        validationFailed: 'Η επικύρωση απέτυχε',
        conflict: 'Αυτή η λειτουργία έρχεται σε σύγκρουση με υπάρχοντα δεδομένα',
        rateLimited: (retryAfter?: number) =>
            retryAfter
                ? `Πάρα πολλά αιτήματα. Παρακαλώ δοκιμάστε ξανά σε ${retryAfter} δευτερόλεπτα.`
                : 'Πάρα πολλά αιτήματα. Παρακαλώ δοκιμάστε ξανά αργότερα.',
        externalService: (service: string) =>
            `Η υπηρεσία ${service} δεν είναι διαθέσιμη αυτή τη στιγμή. Παρακαλώ δοκιμάστε ξανά αργότερα.`,
        internalError: 'Παρουσιάστηκε ένα απροσδόκητο σφάλμα. Η ομάδα μας έχει ενημερωθεί.'
    }
}

/**
 * Get error message in specified language
 */
export function getErrorMessage(
    key: keyof I18nErrorMessages,
    language: Language = 'en',
    ...args: unknown[]
): string {
    const messages = errorMessages[language]
    const message = messages[key]

    if (typeof message === 'function') {
        return (message as (...args: unknown[]) => string)(...args)
    }

    return message as string
}

/**
 * Get all error messages for a language
 */
export function getErrorMessages(language: Language = 'en'): I18nErrorMessages {
    return errorMessages[language]
}
