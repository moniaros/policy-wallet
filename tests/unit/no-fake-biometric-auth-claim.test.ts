import { describe, it, expect } from 'vitest'
import { readFileSync } from "node:fs"
import { globSync } from "../helpers/glob"

/**
 * The auth UI must not promise biometric / FaceID login the product cannot
 * deliver. There is no WebAuthn/passkey LOGIN flow: since PW-PROVENANCE-01
 * R-01 a passkey is a SECOND factor (app/auth/step-up, the settings block),
 * asked after the password — never a way to sign in. The sign-in page's fake "Biometric / PIN" unlock was
 * removed for exactly this reason — but its twin, a "Use FaceID after first
 * signup" hint, survived on the sign-up form and shipped on every device
 * (FaceID is Apple-only). A false trust signal on the very first screen.
 *
 * This is a cross-file guard on purpose: the last regression survived because
 * sign-in was fixed and sign-up was missed. Explanatory comments that mention
 * these terms are stripped before the check, so documenting the removal is fine.
 */
const stripComments = (s: string) =>
    s
        .replace(/\/\*[\s\S]*?\*\//g, '') // block + JSX {/* ... */} comments
        .replace(/^\s*\/\/.*$/gm, '') // line comments

/** The predicates, hoisted so the probes below exercise the exact expressions
 *  the guard runs — not copies that can drift. */
const WEBAUTHN_FLOW = /navigator\.credentials\.(get|create)|startAuthentication|startRegistration/
const FACEID_CLAIM = /face\s?id/i
const BIOMETRIC_CLAIM = /biometric\s+(unlock|login|sign)/i

/** Every line of `raw` (comments stripped) that promises biometric login. */
export function biometricClaimOffenders(file: string, raw: string): string[] {
    const offenders: string[] = []
    stripComments(raw).split('\n').forEach((line, i) => {
        if (FACEID_CLAIM.test(line) || BIOMETRIC_CLAIM.test(line)) {
            offenders.push(`${file}:${i + 1}  ${line.trim()}`)
        }
    })
    return offenders
}

describe('the auth UI never claims biometric/FaceID login without a real WebAuthn flow', () => {
    const authFiles = [
        'app/auth/signup/SignupForm.tsx',
        'app/auth/signin/page.tsx',
    ]

    it('the WebAuthn flows are the step-up, the enrolment block and the sign-in page (spec v2 §19.1) — never sign-up', () => {
        // PW-PROVENANCE-01 R-01 implemented passkeys as a second factor over the
        // Supabase session: the step-up page and the settings enrolment block.
        // Spec v2 Phase 6 (2026-09-23) added a REAL passkey sign-in on the
        // sign-in page (app/api/auth/passkeys/login/*), so that page now carries
        // a flow legitimately. The copy guard below still holds: the button says
        // «κλειδί πρόσβασης», never FaceID — the platform decides the biometric,
        // not this product. The set is asserted EXACTLY so a flow appearing on
        // the SIGN-UP screen is noticed, as is one of these going missing.
        const flows = [
            ...globSync('app/**/*.ts'),
            ...globSync('app/**/*.tsx'),
            ...globSync('hooks/**/*.ts'),
            ...globSync('components/**/*.tsx'),
        ]
            .filter((f) => !f.includes('.test.') && !f.includes('erasure'))
            .filter((f) => WEBAUTHN_FLOW.test(stripComments(readFileSync(f, 'utf-8'))))
            .sort()
        expect(flows).toEqual(['app/auth/signin/page.tsx', 'app/auth/step-up/StepUpClient.tsx', 'components/settings/PasskeysBlock.tsx'])
        expect(WEBAUTHN_FLOW.test(readFileSync('app/auth/signup/SignupForm.tsx', 'utf-8'))).toBe(false)
    })

    it('no auth screen renders a FaceID / biometric-unlock promise', () => {
        const offenders = authFiles.flatMap((file) =>
            biometricClaimOffenders(file, readFileSync(file, 'utf-8'))
        )
        expect(
            offenders,
            `auth UI promises biometric login the product cannot deliver:\n${offenders.join('\n')}`,
        ).toEqual([])
    })
})

/**
 * PROBES — proven against the promise that actually shipped: SignupForm.tsx as
 * it stood before f1821b50 removed the hint. Verbatim, motion wrapper and all,
 * because the matcher has to fire on the real JSX shape, not on a tidy quote.
 */
describe('the matcher is proven against the pre-fix signup hint (f1821b50~1)', () => {
    const PRE_FIX = `
        <AnimatePresence>
            {isMobileValid && strength >= 2 && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="inline-flex items-center gap-1.5 rounded-full">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    {t("Χρήση FaceID μετά την πρώτη εγγραφή", "Use FaceID after first signup")}
                </motion.div>
            )}
        </AnimatePresence>
    `

    it('flags the exact line, and the message names it', () => {
        const offenders = biometricClaimOffenders('app/auth/signup/SignupForm.tsx', PRE_FIX)
        expect(offenders).toHaveLength(1)
        expect(offenders[0]).toContain('app/auth/signup/SignupForm.tsx:')
        expect(offenders[0]).toContain('FaceID')
    })

    it('a tombstone comment about the removal is not the defect', () => {
        const commentedOnly = `
            {/* The FaceID hint used to live here — removed in f1821b50, a promise
                the app cannot keep (no WebAuthn flow exists). */}
            <TermsCheckbox />
        `
        expect(biometricClaimOffenders('x.tsx', commentedOnly)).toEqual([])
    })

    it('flags the "biometric unlock" twin the sign-in page carried', () => {
        expect(
            biometricClaimOffenders('x.tsx', '<span>{t("Βιομετρικό", "Biometric unlock / PIN")}</span>')
        ).toHaveLength(1)
    })

    it('the premise detector fires on a real WebAuthn call, so honest claims can unlock', () => {
        expect(WEBAUTHN_FLOW.test('const cred = await navigator.credentials.get({ publicKey })')).toBe(true)
        expect(WEBAUTHN_FLOW.test('await startRegistration(options)')).toBe(true)
        expect(WEBAUTHN_FLOW.test('const x = passkeyCredential.count()')).toBe(false)
    })
})
