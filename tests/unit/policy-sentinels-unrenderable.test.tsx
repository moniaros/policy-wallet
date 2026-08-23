/**
 * No placeholder policy identity may reach a rendered surface. Ever.
 *
 * The bug this pins: a policy is created with `insurer_name =
 * '__PENDING_EXTRACTION__'` and `policy_number = 'PENDING-<epoch>'` before
 * extraction knows better, and the wallet's notice strip interpolated the raw
 * column — so a customer read
 *
 *     "Αυτοκίνητο · __PENDING_EXTRACTION__: λείπουν στοιχεία από το έγγραφο."
 *
 * Discarding failed policies does NOT close this on its own: the AI providers
 * substitute `Unknown Insurer` / `PENDING-<epoch>` for an empty extraction on a
 * SUCCESSFUL run, and `buildMetadata` keeps whatever is stored when the
 * evidence gate rejects a document. A placeholder can therefore reach a
 * perfectly healthy `active` policy.
 *
 * Three layers are asserted here:
 *   1. the primitive itself (lib/wallet/policy-identity)
 *   2. real components rendered with a placeholder policy — the DOM is checked
 *   3. a repo scan, so the next screen cannot re-implement the check inline and
 *      get it wrong the way five screens already had
 */
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { readFileSync, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import path from 'node:path'

import { LanguageProvider } from '@/contexts/LanguageContext'
import { TranslationsProvider } from '@/contexts/TranslationsProvider'
import {
    POLICY_IDENTITY_PLACEHOLDERS,
    containsPlaceholderText,
    displayInsurerName,
    displayPolicyNumber,
    fileNameLabel,
    hasPlaceholderIdentity,
    isPlaceholderInsurerName,
    isPlaceholderPolicyNumber,
    policyIdentityView,
    policyLabel,
    redactPolicyPlaceholders,
    scrubPolicyIdentity,
} from '@/lib/wallet/policy-identity'
import { resolveInsurerDisplay } from '@/lib/wallet/insurer-registry'
import { buildPolicyReviewData } from '@/lib/wallet/policy-review'
import { PolicyWallet } from '@/components/wallet/PolicyWallet'
import { PolicyCard } from '@/components/wallet/PolicyCard'
import type { Policy } from '@/components/wallet/types'

const REPO_ROOT = path.resolve(__dirname, '../..')

/** Every literal shape the three writing layers have ever produced. */
const SENTINELS = [
    '__PENDING_EXTRACTION__',
    'PENDING-1786732800000',
    'PENDING-A1B2C3D4',
    'AI Analyzing...',
    'Unknown Insurer',
    'Άγνωστος ασφαλιστής',
]

const placeholderPolicy = (overrides: Partial<Policy> = {}): Policy =>
    ({
        id: 'pol-1',
        policyNumber: 'PENDING-1786732800000',
        insurerName: '__PENDING_EXTRACTION__',
        insurerLogo: null,
        lineOfBusiness: 'motor',
        status: 'action_needed',
        startDate: '2026-01-01T00:00:00.000Z',
        endDate: '2027-01-01T00:00:00.000Z',
        lastUpdated: '2026-08-14T00:00:00.000Z',
        sharedWithAgents: [],
        coverageHighlights: [],
        documents: [
            { id: 'doc-1', fileName: 'ΑΣΦΑΛΙΣΤΗΡΙΟ 2026.pdf', uploadedAt: '2026-08-14T00:00:00.000Z', uploadedBy: 'policyholder' },
        ],
        ...overrides,
    }) as Policy

function withProviders(node: React.ReactNode) {
    return render(
        <LanguageProvider>
            <TranslationsProvider>{node}</TranslationsProvider>
        </LanguageProvider>
    )
}

/** Assert the rendered DOM carries no placeholder, in any form. */
function expectNoSentinel(text: string) {
    for (const sentinel of POLICY_IDENTITY_PLACEHOLDERS) {
        expect(text).not.toContain(sentinel)
    }
}

describe('policy-identity — the primitive', () => {
    it('recognises every placeholder shape any layer writes', () => {
        expect(isPlaceholderInsurerName('__PENDING_EXTRACTION__')).toBe(true)
        expect(isPlaceholderInsurerName('AI Analyzing...')).toBe(true)
        expect(isPlaceholderInsurerName('Unknown Insurer')).toBe(true)
        expect(isPlaceholderInsurerName('unknown insurer')).toBe(true)
        expect(isPlaceholderInsurerName('Άγνωστος ασφαλιστής')).toBe(true)
        expect(isPlaceholderInsurerName('')).toBe(true)
        expect(isPlaceholderInsurerName(null)).toBe(true)

        expect(isPlaceholderPolicyNumber('PENDING-1786732800000')).toBe(true)
        expect(isPlaceholderPolicyNumber('PENDING-A1B2C3D4')).toBe(true)
        expect(isPlaceholderPolicyNumber('pending-abc')).toBe(true)
        expect(isPlaceholderPolicyNumber(null)).toBe(true)
    })

    it('leaves real values completely alone', () => {
        expect(isPlaceholderInsurerName('Interamerican')).toBe(false)
        expect(isPlaceholderInsurerName('Εθνική Ασφαλιστική')).toBe(false)
        expect(isPlaceholderPolicyNumber('POL-123')).toBe(false)
        // A real number that merely CONTAINS the word must not be eaten.
        expect(isPlaceholderPolicyNumber('AB-PENDING-9')).toBe(false)
        expect(displayInsurerName('Interamerican', 'fallback')).toBe('Interamerican')
        expect(displayPolicyNumber('POL-123')).toBe('POL-123')
    })

    it('falls back to a caller-supplied label, never to the placeholder', () => {
        expect(displayInsurerName('__PENDING_EXTRACTION__', 'Αυτοκίνητο')).toBe('Αυτοκίνητο')
        expect(displayInsurerName('__PENDING_EXTRACTION__')).toBe('')
        // A policy number is never invented: a wrong one is worse than none.
        expect(displayPolicyNumber('PENDING-123')).toBeNull()
    })

    it('uses the uploaded file name as a label the customer recognises', () => {
        expect(fileNameLabel('ΑΣΦΑΛΙΣΤΗΡΙΟ 2026.pdf')).toBe('ΑΣΦΑΛΙΣΤΗΡΙΟ 2026')
        expect(fileNameLabel('my_policy-scan.PDF')).toBe('my policy scan')
        expect(fileNameLabel(null)).toBe('')
    })

    it('treats a policy as placeholder-identity only when BOTH halves are placeholders', () => {
        expect(hasPlaceholderIdentity({ insurerName: '__PENDING_EXTRACTION__', policyNumber: 'PENDING-1' })).toBe(true)
        // An agent typed the insurer — there is real work here to lose.
        expect(hasPlaceholderIdentity({ insurerName: 'Interamerican', policyNumber: 'PENDING-1' })).toBe(false)
        expect(hasPlaceholderIdentity({ insurerName: '__PENDING_EXTRACTION__', policyNumber: 'POL-9' })).toBe(false)
    })

    it('names a policy inside a sentence without leaking a placeholder', () => {
        expect(policyLabel({ insurerName: 'Interamerican', policyNumber: 'POL-1' })).toBe('Interamerican (POL-1)')
        expect(policyLabel({ insurerName: 'Interamerican', policyNumber: 'PENDING-1' })).toBe('Interamerican')
        expect(policyLabel({ insurerName: '__PENDING_EXTRACTION__', policyNumber: 'PENDING-1' })).toBe('')
        expect(policyLabel({ insurerName: '__PENDING_EXTRACTION__', policyNumber: 'PENDING-1' }, 'το έγγραφό σας')).toBe(
            'το έγγραφό σας'
        )
    })

    it('redacts a placeholder out of an already-composed sentence and tidies after itself', () => {
        const el = redactPolicyPlaceholders(
            'Το ασφαλιστήριο συμβόλαιο PENDING-1786732800000 (__PENDING_EXTRACTION__) αναλύθηκε επιτυχώς.'
        )
        expectNoSentinel(el)
        expect(el).toBe('Το ασφαλιστήριο συμβόλαιο αναλύθηκε επιτυχώς.')

        const en = redactPolicyPlaceholders('Policy PENDING-1 (Unknown Insurer) has been analyzed.')
        expectNoSentinel(en)
        expect(en).toBe('Policy has been analyzed.')

        // Real copy is untouched.
        expect(redactPolicyPlaceholders('Policy POL-1 (Interamerican) has been analyzed.')).toBe(
            'Policy POL-1 (Interamerican) has been analyzed.'
        )
    })

    it('scrubs a policy-shaped object at a read boundary', () => {
        const scrubbed = scrubPolicyIdentity(
            { id: 'p1', insurerName: '__PENDING_EXTRACTION__', policyNumber: 'PENDING-9' },
            'Αυτοκίνητο'
        )
        expect(scrubbed.insurerName).toBe('Αυτοκίνητο')
        expect(scrubbed.policyNumber).toBe('')
        expect(scrubbed.id).toBe('p1')
    })

    it('reports a pending identity so a caller can show an "analysing" hint', () => {
        expect(policyIdentityView({ insurerName: 'Interamerican', policyNumber: 'PENDING-1' }).isPending).toBe(true)
        expect(policyIdentityView({ insurerName: 'Interamerican', policyNumber: 'POL-1' }).isPending).toBe(false)
    })

    it('detects a placeholder inside arbitrary composed text', () => {
        expect(containsPlaceholderText('Αυτοκίνητο · __PENDING_EXTRACTION__')).toBe(true)
        expect(containsPlaceholderText('Αυτοκίνητο · Interamerican')).toBe(false)
    })
})

describe('the shared insurer resolver refuses to launder a placeholder', () => {
    it.each(SENTINELS.filter((s) => !s.startsWith('PENDING-')))('resolves %s to nothing', (sentinel) => {
        expect(resolveInsurerDisplay(sentinel).displayName).toBe('')
    })

    it('still normalises a real Greek insurer name', () => {
        expect(resolveInsurerDisplay('ΕΘΝΙΚΗ Η ΠΡΩΤΗ ΑΣΦΑΛΙΣΤΙΚΗ').displayName).toBe('Εθνική Ασφαλιστική')
    })
})

describe('the review read model strips both halves', () => {
    it('returns null rather than a placeholder', () => {
        const data = buildPolicyReviewData({
            id: 'p1',
            status: 'action_needed',
            insurerName: '__PENDING_EXTRACTION__',
            lineOfBusiness: 'motor',
            policyNumber: 'PENDING-1786732800000',
            startDate: new Date('2026-01-01'),
            endDate: new Date('2027-01-01'),
            premiumAmount: null,
            premiumCurrency: 'EUR',
            acordData: { processingError: { code: 'TOKEN_LIMIT_BLOCKED' } },
        })

        expect(data.insurerName).toBeNull()
        expect(data.policyNumber).toBeNull()
        // The reason travels as a code the UI localizes — never as prose.
        expect(data.processingErrorCode).toBe('TOKEN_LIMIT_BLOCKED')
        expectNoSentinel(JSON.stringify(data))
    })
})

describe('rendered output — the DOM itself', () => {
    it('the wallet notice strip never prints the placeholder that shipped to a customer', () => {
        const { container } = withProviders(
            <PolicyWallet
                policies={[placeholderPolicy()]}
                user={{ name: 'Test', email: 'test@example.com' } as any}
            />
        )
        expectNoSentinel(container.textContent || '')
    })

    it.each([
        ['both halves placeholder', placeholderPolicy()],
        ['provider substitution on a successful run', placeholderPolicy({ insurerName: 'Unknown Insurer', status: 'active' })],
        ['upload-path placeholder', placeholderPolicy({ insurerName: 'AI Analyzing...', policyNumber: 'PENDING-A1B2C3D4', status: 'analyzing' })],
        ['Greek provider substitution', placeholderPolicy({ insurerName: 'Άγνωστος ασφαλιστής', status: 'active' })],
    ])('the wallet renders %s without leaking it', (_label, policy) => {
        const { container } = withProviders(
            <PolicyWallet policies={[policy]} user={{ name: 'Test', email: 'test@example.com' } as any} />
        )
        expectNoSentinel(container.textContent || '')
    })

    it('the policy card falls back to the branch label instead', () => {
        const { container } = withProviders(<PolicyCard policy={placeholderPolicy()} />)
        const text = container.textContent || ''
        expectNoSentinel(text)
        // Something still names the policy — it does not render blank.
        expect(text.length).toBeGreaterThan(0)
    })

    it('a real policy still renders its real identity', () => {
        const { container } = withProviders(
            <PolicyCard policy={placeholderPolicy({ insurerName: 'Interamerican', policyNumber: 'POL-42', status: 'active' })} />
        )
        expect(container.textContent).toContain('Interamerican')
    })
})

/**
 * The recurrence guard.
 *
 * Five screens had each re-implemented "is this a placeholder" inline, and each
 * knew a different subset of the literals — which is exactly why a sixth screen
 * shipped with none of them. Only the primitive (and the layers that WRITE a
 * placeholder) may name these strings.
 */
describe('centrality — no file re-implements the check', () => {
    const ALLOWED = new Set([
        // The single owner of the literals.
        'lib/wallet/policy-identity.ts',
        // The three layers that legitimately WRITE a placeholder.
        'components/wallet/AddPolicyClient.tsx',
        'lib/services/policy.service.ts',
        'lib/services/ai/gemini-ai.service.ts',
        'lib/services/ai/anthropic-ai.service.ts',
        'lib/services/ai/openai-ai.service.ts',
        // The cleanup script has to find them in the database.
        'scripts/cleanup-sentinel-policies.ts',
    ])

    it('only the primitive and the writers know the literal strings', () => {
        const tracked = execFileSync(
            'git',
            ['ls-files', 'app', 'components', 'lib', 'scripts', 'hooks', 'contexts'],
            { cwd: REPO_ROOT, encoding: 'utf-8' }
        )
            .split('\n')
            .filter((f) => /\.(ts|tsx)$/.test(f))
            // `git ls-files` reports the INDEX, which still lists a file after
            // it is deleted from disk and before the deletion is staged. A file
            // that no longer exists cannot render a sentinel; skipping it keeps
            // this guard runnable mid-refactor (first hit: ProtectionScoreCard's
            // deletion in P1-01).
            .filter((f) => existsSync(path.join(REPO_ROOT, f)))

        const offenders: string[] = []
        for (const file of tracked) {
            if (ALLOWED.has(file)) continue
            const source = readFileSync(path.join(REPO_ROOT, file), 'utf-8')
            // Comment prose legitimately explains what the placeholders are and
            // why this module no longer matches them by hand — it is the CODE
            // that must not know the literals.
            const code = source
                .replace(/\/\*[\s\S]*?\*\//g, '')
                .split('\n')
                .map((line) => line.replace(/^\s*\/\/.*$/, ''))
                .join('\n')

            const hasLiteral =
                /['"`]__PENDING_EXTRACTION__['"`]/.test(code) ||
                /['"`]PENDING-['"`]/.test(code) ||
                /startsWith\(\s*['"`]PENDING-/.test(code)
            if (hasLiteral) offenders.push(file)
        }

        expect(
            offenders,
            `These files hardcode a policy-identity placeholder instead of importing ` +
                `lib/wallet/policy-identity:\n  ${offenders.join('\n  ')}`
        ).toEqual([])
    })
})
