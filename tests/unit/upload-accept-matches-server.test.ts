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
        // The wallet, onboarding and agent-commit doors all validate inside the
        // ONE ingestion path (Sept 2026); the bulk modal's door is the extract route.
        ['components/onboarding/protection-profile/UploadScreen.tsx', 'policy', 'lib/ingestion/ingest-policy-document.ts'],
        ['components/onboarding/agent/LicenseVerificationStep.tsx', 'policy', 'app/onboarding/agent/actions.ts'],
        ['components/wallet/AddPolicyClient.tsx', 'policy', 'lib/ingestion/ingest-policy-document.ts'],
        ['components/wallet/BatchUploadModal.tsx', 'policy', 'app/api/policies/extract/route.ts'],
        // AddCustomerModal left this list on 2026-09-04: it no longer picks a
        // file. Its «Έξυπνη Μεταφόρτωση PDF» door parsed the document and then
        // DROPPED it (see the scan-without-commit guard below); the door now
        // opens UploadPolicyModal, which is the picker.
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

/**
 * A client component that SCANS a policy document must also COMMIT it.
 *
 * AddCustomerModal's «Έξυπνη Μεταφόρτωση PDF» door handed the File to
 * parsePolicyPdfWithGemini, copied the extracted fields into the manual form,
 * and then submitted addCustomerManually WITHOUT the file — the policy was
 * created active with zero documents and no analysis (the incident class
 * CLAUDE.md names: nothing threw, every piece worked, the seam broke).
 *
 * The universe is every client component under components/ and app/
 * (enumerated from the filesystem, not listed) whose comment-stripped source
 * calls a scan action. Each one must retain the scanned File across steps
 * (`useState<File | null>`) and append it a SECOND time — into the FormData
 * that goes to commitScannedPolicy — so the same file the model read is the
 * file that gets stored. A component that scans and never commits is red.
 */
const SCAN_ACTION = /\b(?:parsePolicyPdfWithGemini|scanPolicyForResolution)\s*\(/
const COMMIT_ACTION = /\bcommitScannedPolicy\s*\(/
const FILE_APPEND = /\.append\(\s*['"]file['"]\s*,/g
const RETAINED_FILE = /useState<\s*File\s*\|\s*null\s*>/

export function scanWithoutCommitOffenders(file: string, rawSrc: string): string[] {
    const code = strip(rawSrc)
    if (!SCAN_ACTION.test(code)) return []
    const appends = (code.match(FILE_APPEND) ?? []).length
    const reasons: string[] = []
    if (!COMMIT_ACTION.test(code)) reasons.push('scans a document but never calls commitScannedPolicy')
    if (appends < 2) reasons.push(`appends the file ${appends} time(s) — the scan needs one and the commit another`)
    if (!RETAINED_FILE.test(code)) reasons.push('does not retain the scanned File across steps (useState<File | null>)')
    return reasons.length > 0 ? [`${file}: ${reasons.join('; ')}`] : []
}

function clientComponents(): string[] {
    return [...globSync('components/**/*.tsx'), ...globSync('app/**/*.tsx')].filter((f) =>
        /^\s*["']use client["']/.test(readFileSync(f, 'utf-8'))
    )
}

describe('a client component that scans a policy document also commits it', () => {
    const scanning = clientComponents().filter((f) => SCAN_ACTION.test(strip(readFileSync(f, 'utf-8'))))

    it('finds the scanning components (a matcher that finds none guards nothing)', () => {
        expect(scanning).toContain('components/agent/UploadPolicyModal.tsx')
    })

    it('AddCustomerModal no longer scans at all — its second door opens the upload flow', () => {
        const src = strip(readFileSync('components/agent/AddCustomerModal.tsx', 'utf-8'))
        expect(src).not.toMatch(SCAN_ACTION)
        expect(src).not.toMatch(/type=["']file["']/)
        expect(src).toMatch(/onUploadInstead/)
    })

    it('every scanning component hands the same File to the commit action', () => {
        const offenders = clientComponents().flatMap((f) => scanWithoutCommitOffenders(f, readFileSync(f, 'utf-8')))
        expect(
            offenders,
            `These scan a document without committing it — the policy would be created with no document:\n  ${offenders.join('\n  ')}`
        ).toEqual([])
    })

    it('the matcher is proven red against the committed probe (the pre-fix door)', () => {
        const probe = readFileSync('tests/fixtures/guard-probes/scan-without-commit.tsx.txt', 'utf-8')
        const offenders = scanWithoutCommitOffenders('components/agent/AddCustomerModal.tsx', probe)
        expect(offenders).toHaveLength(1)
        expect(offenders[0]).toContain('never calls commitScannedPolicy')
        expect(offenders[0]).toContain('appends the file 1 time(s)')
    })

    it('and green against the live UploadPolicyModal', () => {
        expect(scanWithoutCommitOffenders('components/agent/UploadPolicyModal.tsx', readFileSync('components/agent/UploadPolicyModal.tsx', 'utf-8'))).toEqual([])
    })
})
