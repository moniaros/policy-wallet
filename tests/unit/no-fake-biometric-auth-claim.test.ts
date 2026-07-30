import { describe, it, expect } from 'vitest'
import { readFileSync } from "node:fs"
import { globSync } from "../helpers/glob"

/**
 * The auth UI must not promise biometric / FaceID login the product cannot
 * deliver. There is no WebAuthn/passkey login flow (the passkeyCredential /
 * webAuthnChallenge tables are referenced only by GDPR erasure, not by any
 * authentication path). The sign-in page's fake "Biometric / PIN" unlock was
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

describe('the auth UI never claims biometric/FaceID login without a real WebAuthn flow', () => {
    const authFiles = [
        'app/auth/signup/SignupForm.tsx',
        'app/auth/signin/page.tsx',
    ]

    it('no client-side WebAuthn login flow exists yet (guard premise still holds)', () => {
        // If this ever fails, real biometric login was implemented — revisit the
        // copy guard below and allow an HONEST claim tied to that flow.
        const src = [
            ...globSync('app/**/*.ts'),
            ...globSync('app/**/*.tsx'),
            ...globSync('hooks/**/*.ts'),
            ...globSync('components/**/*.tsx'),
        ]
            .filter((f) => !f.includes('.test.') && !f.includes('erasure'))
            .map((f) => readFileSync(f, 'utf-8'))
            .join('\n')
        expect(/navigator\.credentials\.(get|create)|startAuthentication|startRegistration/.test(src)).toBe(false)
    })

    it('no auth screen renders a FaceID / biometric-unlock promise', () => {
        const offenders: string[] = []
        for (const file of authFiles) {
            const rendered = stripComments(readFileSync(file, 'utf-8'))
            rendered.split('\n').forEach((line, i) => {
                if (/face\s?id/i.test(line) || /biometric\s+(unlock|login|sign)/i.test(line)) {
                    offenders.push(`${file}:${i + 1}  ${line.trim()}`)
                }
            })
        }
        expect(
            offenders,
            `auth UI promises biometric login the product cannot deliver:\n${offenders.join('\n')}`,
        ).toEqual([])
    })
})
