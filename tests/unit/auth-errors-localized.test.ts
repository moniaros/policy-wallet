import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

/**
 * app/auth/actions.ts returns error strings that the client displays VERBATIM
 * (setServerError(result.error)), so on this Greek-default app they must be
 * localised at the source. lint:i18n-changed only checks .tsx, so the auth
 * actions' hardcoded English shipped unflagged — a Greek user hit "User already
 * exists" / "Invalid Greek mobile number" in English at the signup entry point.
 *
 * These are the user-facing messages from the functions that HAVE the recipient's
 * language (registerUser, resetPasswordForEmail, resendVerificationEmail). Each
 * must be wrapped in authErr(language, …), never a bare `error: "English"`.
 */
const SRC =
    readFileSync('app/auth/actions.ts', 'utf-8') +
    '\n' +
    readFileSync('app/auth/verify-email/actions.ts', 'utf-8') +
    '\n' +
    readFileSync('app/(protected)/account/actions.ts', 'utf-8')

const LOCALIZED_MESSAGES = [
    'Too many signup attempts. Please try again in a few minutes.',
    'Invalid Greek mobile number',
    'Registration failed. Please try again.',
    'User already exists',
    'An unexpected error occurred during registration.',
    'Too many verification email requests. Please try again later.',
    'Failed to resend verification email.',
    'Too many password reset attempts. Please try again later.',
    'Please provide a valid email address.',
    'Failed to send password reset email.',
    // resetPasswordWithToken — language now threaded from the reset client.
    'Invalid reset request.',
    'Password must be at least 8 characters.',
    'Could not find account for this reset request.',
    'Server auth configuration is incomplete.',
    // verifyEmailToken — language threaded from the verify-email page.
    'Missing token or email',
    'Invalid or expired verification link',
    'Verification link has expired. Please request a new one.',
    'User not found',
    'An unexpected error occurred during verification',
    // account actions (upgradeSubscription / cancelSubscription) shown raw via toast.
    'Plan not found',
    'Plan is not purchasable',
    'You are already on this plan.',
    'Failed to initialize payment',
    'Failed to cancel the subscription with Stripe. Please try again or use the billing portal.',
]

describe('auth action errors are localised (not bare English)', () => {
    it('every user-facing auth error is wrapped in authErr, never a bare error literal', () => {
        const stillBare = LOCALIZED_MESSAGES.filter((m) =>
            SRC.includes(`error: "${m}"`),
        )
        expect(stillBare, `bare English auth errors (wrap in authErr(language, …)):\n${stillBare.join('\n')}`).toEqual([])
    })

    it('each localised message carries a Greek translation via authErr', () => {
        for (const m of LOCALIZED_MESSAGES) {
            // authErr/vErr/acctErr(language, "<greek>", "<this english>") — English is the 3rd arg.
            const re = new RegExp(`(authErr|vErr|acctErr)\\(language,\\s*"[^"]*[Α-Ωα-ω][^"]*",\\s*"${m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"\\)`)
            expect(re.test(SRC), `"${m}" is not localised via authErr with a Greek string`).toBe(true)
        }
    })
})
