import { describe, it, expect } from 'vitest'
import { readFileSync } from "node:fs"
import { globSync } from "../helpers/glob"
import { acceptAttribute } from '@/lib/security/file-upload'

const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

/**
 * The server validates uploads against CATEGORY_EXTENSIONS with magic-byte
 * sniffing. Five pickers each carried their own hand-written `accept` string and
 * none of them matched it:
 *
 *   - the main "add a policy" flow offered `.pdf,.png,.jpg,.jpeg`, so an iPhone
 *     photo of a policy — HEIC by default — was greyed out on the product's
 *     primary upload path, while the batch modal's `image/*` took it happily;
 *   - the agent's add-customer modal took `application/pdf` alone, so an agent
 *     could not photograph a client's policy at all;
 *   - a document request offered `.doc,.docx` — right for its category, and
 *     right only by coincidence.
 *
 * The picker must offer exactly what the server will accept.
 */
describe('the file picker offers what the server accepts', () => {
    it('a policy accepts what the server allows, HEIC included', () => {
        const accept = acceptAttribute('policy')
        for (const ext of ['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.heic']) {
            expect(accept, ext).toContain(ext)
        }
        // Safari matches on MIME; HEIC often arrives with an empty type, so both
        // forms have to be offered.
        expect(accept).toContain('image/heic')
        expect(accept).toContain('image/heif')
        expect(accept).toContain('application/pdf')
    })

    it('a policy does NOT offer Word — the server rejects it for that category', () => {
        expect(acceptAttribute('policy')).not.toContain('.doc')
    })

    it('a document request does offer Word, because that category allows it', () => {
        const accept = acceptAttribute('document')
        expect(accept).toContain('.doc')
        expect(accept).toContain('.docx')
        expect(accept).toContain('.heic')
    })

    it('an image upload offers neither PDF nor Word', () => {
        const accept = acceptAttribute('image')
        expect(accept).not.toContain('.pdf')
        expect(accept).not.toContain('.doc')
        expect(accept).toContain('.png')
    })

    it('no policy or document picker hand-writes its own list', () => {
        const offenders: string[] = []
        for (const f of [...globSync('components/**/*.tsx'), ...globSync('app/**/*.tsx')]) {
            const src = strip(readFileSync(f, 'utf-8'))
            // A literal accept string mentioning pdf or a doc format is a
            // hand-kept copy of the server's allowlist.
            for (const m of src.matchAll(/accept=(["'])([^"']*)\1/g)) {
                if (/pdf|docx?|heic|image\/\*/i.test(m[2])) offenders.push(`${f}: ${m[2]}`)
            }
        }
        expect(offenders, `hand-written accept lists:\n${offenders.join('\n')}`).toEqual([])
    })
})

/**
 * Each picker must name the category its own server path validates against.
 * Getting this wrong reintroduces the defect in the other direction — offering a
 * format the server will reject. It nearly happened while fixing it: the agent
 * licence upload validates as 'policy', not 'document'.
 */
describe('each picker names its own server category', () => {
    const PAIRS: Array<[string, string, string]> = [
        // picker file, category it asks for, server file that validates it
        ['components/onboarding/protection-profile/UploadScreen.tsx', 'policy', 'lib/services/policy.service.ts'],
        ['components/onboarding/agent/LicenseVerificationStep.tsx', 'policy', 'app/onboarding/agent/actions.ts'],
        ['components/wallet/AddPolicyClient.tsx', 'policy', 'lib/services/policy.service.ts'],
        ['components/wallet/BatchUploadModal.tsx', 'policy', 'lib/services/policy.service.ts'],
        ['components/agent/AddCustomerModal.tsx', 'policy', 'app/(protected)/agent/actions.ts'],
        ['components/agent/UploadPolicyModal.tsx', 'policy', 'app/(protected)/agent/actions.ts'],
        // Policy-detail "add a document" card. Its booklet arm posts to the
        // documents REST route; its renewal arm goes through
        // PolicyService.attachRenewalDocument, which also validates 'policy'
        // (already asserted via the pairs above that name policy.service.ts).
        ['components/wallet/policy-detail/AddDocumentCard.tsx', 'policy', 'app/api/v1/policies/[id]/documents/route.ts'],
    ]

    it.each(PAIRS)('%s asks for "%s"', (picker, category) => {
        const src = strip(readFileSync(picker, 'utf-8'))
        expect(src).toMatch(new RegExp(`acceptAttribute\\(["']${category}["']\\)`))
    })

    it('and the server file it pairs with validates that category', () => {
        for (const [picker, category, server] of PAIRS) {
            const src = strip(readFileSync(server, 'utf-8'))
            expect(src, `${server} (for ${picker})`).toMatch(
                new RegExp(`category: *(type === 'logo' \\? 'image' : )?["']${category}["']`)
            )
        }
    })
})
