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

// ─────────────────────────────────────────────────────────────────────────────
// P1-07 — person display names and fixture identifiers (same class, one guard).
//
// «Καλώς ήρθατε πίσω, E2E!» was not a copy defect: the string is clean and the
// fixture USER NAME was interpolated into it. The universe of person-name
// render sites was enumerated from the filesystem (D-005): every interpolation
// of `user.name` / `agent.name` / `grantee.name` / `share.name` under `app/` +
// `components/` + `lib/email/` on a B2C surface. Each probe below is
// self-checked (the probe demonstrably carries the token) so a gutted fixture
// fails instead of passing vacuously.
// ─────────────────────────────────────────────────────────────────────────────
import { vi } from 'vitest'

// PolicyWalletClient statically imports two "use server" modules whose
// transitive graph parses process.env (lib/storage → lib/env) and opens the
// database. Neither is exercised here — the DOM assertions never click — so
// they are mocked to keep this guard runnable as a pure unit test.
vi.mock('@/app/(protected)/wallet/actions', () => ({
    runPolicyAnalysis: vi.fn(),
    deletePolicy: vi.fn(),
}))
vi.mock('@/app/onboarding/actions', () => ({
    dismissTour: vi.fn(),
    completeOnboardingStep: vi.fn(),
}))

import {
    SYNTHETIC_PERSON_NAME_PATTERNS,
    assertRenderableText,
    containsFixtureIdentifier,
    displayPersonName,
    firstNameLabel,
    isSyntheticPersonName,
    scrubRenderableText,
} from '@/lib/wallet/policy-identity'
import { buildNotificationEmail } from '@/lib/mail-templates'
import { UserMenu } from '@/components/shell/UserMenu'
import { PolicyWalletClient } from '@/components/wallet/PolicyWalletClient'

const PROBES_DIR = path.join(REPO_ROOT, 'tests/fixtures/guard-probes')
const probeLines = (name: string): string[] =>
    readFileSync(path.join(PROBES_DIR, name), 'utf-8')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)

describe('person display names — the primitive', () => {
    const synthetic = probeLines('synthetic-person-names.txt')
    const real = probeLines('real-person-names.txt')

    it('the probe fixtures are intact (a gutted probe must not pass silently)', () => {
        expect(synthetic).toContain('E2E Policyholder')
        expect(synthetic).toContain('Agent User')
        expect(synthetic.some((n) => /^Policyholder\s\d/.test(n))).toBe(true)
        expect(real).toContain('Νίκος Παπαδόπουλος')
        // The false positives that matter: a chi-initial Greek name and a
        // surname that merely STARTS with a test token.
        expect(real).toContain('Χρήστος Παπάς')
        expect(real).toContain('Maria Demopoulos')
    })

    it.each(probeLines('synthetic-person-names.txt'))(
        'never renders %s as a person\'s name',
        (name) => {
            expect(isSyntheticPersonName(name)).toBe(true)
            // Flow-through: the synthetic value goes IN and the fallback comes
            // OUT — proof the probe exercised the scrub, not just the matcher.
            expect(displayPersonName(name)).toBe('')
            expect(displayPersonName(name, 'honest fallback')).toBe('honest fallback')
            expect(firstNameLabel(name)).toBe('')
        }
    )

    it.each(probeLines('real-person-names.txt'))('leaves the real name %s alone', (name) => {
        expect(isSyntheticPersonName(name)).toBe(false)
        expect(displayPersonName(name)).toBe(name)
        expect(firstNameLabel(name)).toBe(name.split(/\s+/)[0])
    })

    it('greets by first name, and only for a real name', () => {
        expect(firstNameLabel('Νίκος Παπαδόπουλος')).toBe('Νίκος')
        expect(firstNameLabel('E2E Policyholder')).toBe('')
        expect(firstNameLabel(null)).toBe('')
    })

    it('detects a fixture identifier in prose, but never a hex colour', () => {
        expect(containsFixtureIdentifier('Προστέθηκε έγγραφο στο E2E-PDM-MOT-ACT.')).toBe(true)
        expect(containsFixtureIdentifier('policy e2e-mot-001 updated')).toBe(true)
        expect(containsFixtureIdentifier('border-[#E2E8F0] bg-white')).toBe(false)
        expect(containsFixtureIdentifier('Το ασφαλιστήριο Interamerican ενημερώθηκε.')).toBe(false)
    })

    it('scrubs both classes out of composed prose and tidies after itself', () => {
        expect(
            scrubRenderableText('Το ασφαλιστήριο E2E-PDM-MOT-ACT (PENDING-1786738708923) αναλύθηκε.')
        ).toBe('Το ασφαλιστήριο αναλύθηκε.')
    })

    it('the enumerated pattern list is what the predicate consults', () => {
        // Every pattern must be exercised by at least one synthetic probe line
        // — an entry nothing can hit is a dead letter, not an enumeration.
        for (const pattern of SYNTHETIC_PERSON_NAME_PATTERNS) {
            expect(
                synthetic.some((name) => pattern.test(name)),
                `No probe line exercises ${pattern}`
            ).toBe(true)
        }
    })
})

describe('§6.1.3 — the notification shell refuses an unresolved identity', () => {
    const payloadFrom = (probe: string) =>
        JSON.parse(readFileSync(path.join(PROBES_DIR, probe), 'utf-8')) as {
            title: string
            message: string
            relatedObjectType?: string
            relatedObjectId?: string
            language: string
        }

    it('dev/test: THROWS on the exact payload that leaked to outbound email', () => {
        const payload = payloadFrom('sentinel-notification-payload.json.txt')
        // Flow-through self-check: the probe genuinely carries the sentinel.
        expect(containsPlaceholderText(payload.message)).toBe(true)
        expect(process.env.NODE_ENV).not.toBe('production')
        expect(() => buildNotificationEmail(payload)).toThrow(/policy-identity/)
    })

    it('dev/test: THROWS on a fixture identifier in the message', () => {
        const payload = payloadFrom('fixture-token-notification-payload.json.txt')
        expect(containsFixtureIdentifier(payload.message)).toBe(true)
        expect(() => buildNotificationEmail(payload)).toThrow(/policy-identity/)
    })

    it('production: degrades honestly — scrubs, keeps the clean copy, never throws', () => {
        const payload = payloadFrom('sentinel-notification-payload.json.txt')
        vi.stubEnv('NODE_ENV', 'production')
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
        try {
            const { subject, html } = buildNotificationEmail(payload)
            expectNoSentinel(html)
            expectNoSentinel(subject)
            expect(html).toContain('Η ανάλυση ολοκληρώθηκε')
            expect(html).toContain('αναλύθηκε')
        } finally {
            consoleError.mockRestore()
            vi.unstubAllEnvs()
        }
    })

    it('production: strips a fixture identifier the same way', () => {
        const payload = payloadFrom('fixture-token-notification-payload.json.txt')
        vi.stubEnv('NODE_ENV', 'production')
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
        try {
            const { html } = buildNotificationEmail(payload)
            expect(containsFixtureIdentifier(html)).toBe(false)
            expect(html).toContain('Νέο έγγραφο ασφαλιστηρίου')
        } finally {
            consoleError.mockRestore()
            vi.unstubAllEnvs()
        }
    })

    it('the assertion primitive itself: loud outside production, honest inside it', () => {
        expect(() => assertRenderableText('Policy PENDING-9 analyzed', 'probe')).toThrow(
            /policy-identity/
        )
        expect(assertRenderableText('Καθαρό κείμενο.', 'probe')).toBe('Καθαρό κείμενο.')
        vi.stubEnv('NODE_ENV', 'production')
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
        try {
            expect(assertRenderableText('Policy PENDING-9 analyzed', 'probe')).toBe(
                'Policy analyzed'
            )
        } finally {
            consoleError.mockRestore()
            vi.unstubAllEnvs()
        }
    })
})

describe('rendered output — fixture names never render as people', () => {
    it('the wallet greeting falls back to the wallet title, never «…, E2E!»', () => {
        const { container } = withProviders(
            <PolicyWalletClient
                policies={[]}
                user={{ id: 'u1', name: 'E2E Policyholder', email: 'e2e-ph@policywallet.test' }}
            />
        )
        const text = container.textContent || ''
        expect(text).not.toContain('E2E')
        expect(text).toContain('Το πορτοφόλι μου')
    })

    it('a real first name still gets its greeting', () => {
        const { container } = withProviders(
            <PolicyWalletClient
                policies={[]}
                user={{ id: 'u1', name: 'Νίκος Παπαδόπουλος', email: 'nikos@example.gr' }}
            />
        )
        const text = container.textContent || ''
        expect(text).toContain('Καλώς ήρθατε πίσω')
        expect(text).toContain('Νίκος')
        expect(text).not.toContain('Παπαδόπουλος') // first name only
    })

    it('the user menu identifies a fixture account by its email, not its fake name', () => {
        const { container } = withProviders(
            <UserMenu user={{ name: 'E2E Policyholder', email: 'e2e-ph@policywallet.test' }} />
        )
        const text = container.textContent || ''
        expect(text).not.toContain('E2E Policyholder')
        expect(text).toContain('e2e-ph@policywallet.test')
    })

    it('the user menu still shows a real name', () => {
        const { container } = withProviders(
            <UserMenu user={{ name: 'Νίκος Παπαδόπουλος', email: 'nikos@example.gr' }} />
        )
        expect(container.textContent).toContain('Νίκος Παπαδόπουλος')
    })
})

/**
 * Centrality, part two: no file re-implements the synthetic-name check inline.
 * app/onboarding/actions.ts had its own copy (`greetingFirstName`) that knew
 * "Agent User" and /^Policyholder(\s|$)/ but not the E2E fixtures — the exact
 * partial-knowledge drift the policy-placeholder scan above exists to prevent.
 * Universe: every tracked .ts/.tsx under app/, components/, lib/, scripts/,
 * hooks/, contexts/ (enumerated from git, same as the scan above).
 */
describe('centrality — no file re-implements the synthetic-name check', () => {
    const ALLOWED_SYNTHETIC = new Set([
        // The single owner of the shapes.
        'lib/wallet/policy-identity.ts',
        // The one layer that legitimately WRITES the signup defaults.
        'app/auth/actions.ts',
    ])

    const knowsSyntheticNameLiterals = (code: string): boolean =>
        /['"`]Agent User['"`]/.test(code) ||
        /\^Policyholder\(/i.test(code) ||
        /`Policyholder \$\{/.test(code)

    it('the matcher is proven red against the committed probe', () => {
        const probe = readFileSync(
            path.join(PROBES_DIR, 'synthetic-name-inline-check.ts.txt'),
            'utf-8'
        )
        expect(knowsSyntheticNameLiterals(probe)).toBe(true)
    })

    it('only the primitive and the signup writer know the synthetic-name shapes', () => {
        const tracked = execFileSync(
            'git',
            ['ls-files', 'app', 'components', 'lib', 'scripts', 'hooks', 'contexts'],
            { cwd: REPO_ROOT, encoding: 'utf-8' }
        )
            .split('\n')
            .filter((f) => /\.(ts|tsx)$/.test(f))
            .filter((f) => existsSync(path.join(REPO_ROOT, f)))

        const offenders: string[] = []
        for (const file of tracked) {
            if (ALLOWED_SYNTHETIC.has(file)) continue
            const source = readFileSync(path.join(REPO_ROOT, file), 'utf-8')
            const code = source
                .replace(/\/\*[\s\S]*?\*\//g, '')
                .split('\n')
                .map((line) => line.replace(/^\s*\/\/.*$/, ''))
                .join('\n')
            if (knowsSyntheticNameLiterals(code)) offenders.push(file)
        }

        expect(
            offenders,
            `These files hardcode a synthetic person-name shape instead of importing ` +
                `lib/wallet/policy-identity:\n  ${offenders.join('\n  ')}`
        ).toEqual([])
    })
})

// ─────────────────────────────────────────────────────────────────────────────
// V2-P1-06 / D-021 — the render boundary, not just the spelling.
//
// The literal scan above forbids a file from KNOWING the sentinel strings. It
// could not see the defect that shipped on /timeline: lib/services/timeline/
// build.ts never spelled a sentinel — it read the FIELD
// (`policy.insurerName?.trim()`), renamed it, and interpolated it into
// bilingual customer copy, so `__PENDING_EXTRACTION__` rendered as a policy
// name while this guard stayed green. A guard forbidding a spelling does not
// enforce a routing rule.
//
// THE UNIVERSE (D-005): every tracked .ts/.tsx under app/, components/, lib/,
// hooks/, contexts/ — enumerated from git at test time, existing on disk —
// minus /admin/ and /agent/ path segments (§12.4: agent and admin surfaces are
// outside B2C jurisdiction). Agent files OUTSIDE those segments that trip the
// matcher are named exemptions below rather than silently path-excluded, so
// their status stays visible.
//
// WHAT IS A RENDER SINK — and what deliberately is not. Reading `.insurerName`
// or `.policyNumber` is usually legitimate: select projections, null checks,
// detection-logic comparisons, event payloads, prop pass-through. ~160 such
// reads exist and flagging them would need a hundred exemptions — a guard with
// a hundred exemptions exempts the problem. So, following the render/
// pass-through distinction score-containment.test.ts already draws, only three
// shapes are flagged — the ones where the raw value becomes customer-visible
// TEXT:
//
//   1. `jsx_text`      — JSX text interpolation: `>{policy.insurerName}` /
//                        `{x.policyNumber}<`. Attribute pass-through
//                        (`insurerName={…}`) does not match: it hands the value
//                        to a component, which the DOM assertions above hold
//                        responsible for its own render.
//   2. `bilingual_copy`— a `${…}` carrying the raw value on a line that is an
//                        `el:`/`en:` initializer or contains Greek text. In
//                        this codebase Greek inside a template IS customer
//                        copy; English internal strings (prompts, audit
//                        descriptions, dedup keys) match neither.
//   3. `identity_pair` — `${…insurerName…}` and `${…policyNumber…}` composed
//                        on one line: the exact "Insurer (Number)" string
//                        policyLabel() exists to build safely. Audit-trail
//                        lines (a `logActivity(` call in the five lines above,
//                        or a same-line `description:` field) are skipped —
//                        the activity log is admin-read.
//
// Taint is lexical and per-file: a direct member read whose chain does not
// root at the translation object `t` (t.wallet.policyNumber is a LABEL), or a
// `const`/`let`/`var` alias whose single-line initializer carries one without
// a sanitizer call, propagated to a fixpoint (build.ts aliased the read as
// `insurer` well above the template that leaked it). STATED LIMITATION:
// destructuring (`const { insurerName } = x`) is not tainted — the one
// occurrence in the universe (app/(protected)/branches/[branch]/page.tsx)
// destructures an already-sanitized value, and tainting the bare name would
// flag it falsely. A leak through a destructured raw read must be caught by
// the DOM assertions, not this scan.
// ─────────────────────────────────────────────────────────────────────────────

type IdentityField = 'insurerName' | 'policyNumber'
interface IdentityRenderViolation {
    line: number
    rule: 'jsx_text' | 'bilingual_copy' | 'identity_pair'
    fields: IdentityField[]
    snippet: string
}

/** Calls that make a read safe: the primitive and its sanctioned resolvers. */
const IDENTITY_SANITIZERS =
    /\b(?:displayInsurerName|displayPolicyNumber|safePolicyNumber|policyLabel|policyIdentityView|scrubPolicyIdentity|resolveInsurerDisplay|redactPolicyPlaceholders|scrubRenderableText|assertRenderableText|isPlaceholderInsurerName|isPlaceholderPolicyNumber|hasPlaceholderIdentity)\s*\(/

/** A member read of an identity column, with its chain's root identifier. */
const IDENTITY_CHAIN = /([A-Za-z_$][\w$]*)((?:\??\.[\w$]+)*?)\??\.(insurerName|policyNumber)\b/g
/** Chains rooted here are translation LABELS (t.wallet.policyNumber), not values. */
const TRANSLATION_ROOTS = new Set(['t'])

function rawIdentityReads(expr: string): Set<IdentityField> {
    const fields = new Set<IdentityField>()
    for (const m of expr.matchAll(IDENTITY_CHAIN)) {
        if (!TRANSLATION_ROOTS.has(m[1])) fields.add(m[3] as IdentityField)
    }
    return fields
}

const IDENTITY_DECL = /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*([^\n;]+)/g

/**
 * Aliases that carry a raw identity value, to a fixpoint: a declaration is
 * tainted when its initializer holds an unsanitized member read OR references
 * an already-tainted alias (`const n = getPolicyNumber()`).
 */
function taintedIdentityAliases(code: string): Map<string, Set<IdentityField>> {
    const tainted = new Map<string, Set<IdentityField>>()
    let changed = true
    while (changed) {
        changed = false
        for (const m of code.matchAll(IDENTITY_DECL)) {
            const [, name, rhs] = m
            if (tainted.has(name)) continue
            if (IDENTITY_SANITIZERS.test(rhs)) continue
            const fields = rawIdentityReads(rhs)
            for (const [alias, aliasFields] of tainted) {
                if (new RegExp(`\\b${alias}\\b`).test(rhs)) {
                    for (const f of aliasFields) fields.add(f)
                }
            }
            if (fields.size > 0) {
                tainted.set(name, fields)
                changed = true
            }
        }
    }
    return tainted
}

function identityTaintOf(expr: string, aliases: Map<string, Set<IdentityField>>): Set<IdentityField> {
    // A sanitizer call anywhere in the expression means the read is wrapped —
    // `${displayInsurerName(policy.insurerName)}` is the FIX, not the defect.
    if (IDENTITY_SANITIZERS.test(expr)) return new Set()
    const fields = rawIdentityReads(expr)
    for (const [alias, aliasFields] of aliases) {
        if (new RegExp(`\\b${alias}\\b`).test(expr)) {
            for (const f of aliasFields) fields.add(f)
        }
    }
    return fields
}

// `(?<!=)` keeps arrow bodies (`=> { p.insurerName }`) from reading as JSX text.
const JSX_TEXT_EXPR = /(?:(?<!=)>\s*\{([^{}\n]*)\})|(?:\{([^{}\n]*)\}\s*<)/g
const TEMPLATE_EXPR = /\$\{([^{}\n]*)\}/g
const EL_EN_KEY_LINE = /^\s*["']?(?:el|en)["']?\s*:/
const GREEK_TEXT = /[Ͱ-Ͽἀ-῿]/
const AUDIT_CALL = /logActivity\s*\(/
const AUDIT_FIELD_LINE = /^\s*description:\s*`/

function stripCommentsForScan(source: string): string {
    return source
        .replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, ' '))
        .split('\n')
        .map((line) => line.replace(/^\s*\/\/.*$/, ''))
        .join('\n')
}

function scanIdentityRenderViolations(source: string): IdentityRenderViolation[] {
    const code = stripCommentsForScan(source)
    const aliases = taintedIdentityAliases(code)
    const lines = code.split('\n')
    const violations: IdentityRenderViolation[] = []

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        if (!line) continue

        // Rule 1 — JSX text interpolation.
        for (const m of line.matchAll(JSX_TEXT_EXPR)) {
            const expr = m[1] ?? m[2] ?? ''
            const taint = identityTaintOf(expr, aliases)
            if (taint.size > 0) {
                violations.push({ line: i + 1, rule: 'jsx_text', fields: [...taint], snippet: line.trim() })
            }
        }

        // Rules 2 and 3 — template interpolation.
        const isCopyLine = EL_EN_KEY_LINE.test(line) || GREEK_TEXT.test(line)
        const lineTaint = new Set<IdentityField>()
        for (const m of line.matchAll(TEMPLATE_EXPR)) {
            const taint = identityTaintOf(m[1] ?? '', aliases)
            for (const f of taint) lineTaint.add(f)
            if (isCopyLine && taint.size > 0) {
                violations.push({ line: i + 1, rule: 'bilingual_copy', fields: [...taint], snippet: line.trim() })
            }
        }
        if (lineTaint.has('insurerName') && lineTaint.has('policyNumber')) {
            const auditWindow = lines.slice(Math.max(0, i - 5), i + 1).join('\n')
            const isAudit = AUDIT_CALL.test(auditWindow) || AUDIT_FIELD_LINE.test(line)
            if (!isAudit) {
                violations.push({
                    line: i + 1,
                    rule: 'identity_pair',
                    fields: ['insurerName', 'policyNumber'],
                    snippet: line.trim(),
                })
            }
        }
    }
    return violations
}

/**
 * Files whose flagged copy is NOTIFICATION content: every one of these routes
 * its title/message through lib/notifications/dispatch.ts, which applies
 * redactPolicyPlaceholders to both before any channel sees them — the
 * boundary the primitive documents as the notification backstop. The value
 * therefore DOES pass through lib/wallet/policy-identity, at the shared
 * boundary rather than the call site. The sanction is excused from rules
 * 2 and 3 only (server files hold no JSX), and two assertions below keep it
 * honest: dispatch must still scrub, and each file must still import the
 * boundary. A file that stops calling emit loses its excuse mechanically.
 */
const NOTIFICATION_BOUNDARY_FILES = new Set([
    'app/(protected)/renewals/actions.ts',
    'app/(protected)/wallet/actions.ts',
    'app/api/v1/collaboration/proposals/[id]/route.ts',
    'lib/services/compliance/obligation-scan.ts',
    'lib/services/policy-merge.service.ts',
    'lib/services/perk-reminder.service.ts',
    'lib/services/renewal.service.ts',
    'lib/services/policy.service.ts',
])

/** Agent-facing surfaces outside the /agent/ path segment — §12.4 out of B2C scope. */
const AGENT_SURFACE_FILES = new Map<string, string>([
    ['app/(protected)/renewals/RenewalsClient.tsx', 'agent renewals board (page.tsx calls getAgentRenewals)'],
    ['app/(protected)/customers/[id]/policy/[policyId]/page.tsx', "agent's customer-policy view (agent role gate)"],
])

/** Composed for a model prompt, never rendered to a customer. */
const MODEL_INPUT_FILES = new Set(['lib/services/ai/prompts.ts'])

/**
 * Identity-pair compositions that are KEYS, not copy: batch-create's
 * `duplicateKey` builds `insurer::number` to compare uploads within one
 * owner's wallet, in memory, and nothing renders it. Excused from
 * `identity_pair` only — a JSX or bilingual-copy hit here would still fail.
 */
const INTERNAL_KEY_FILES = new Set(['app/api/policies/batch-create/route.ts'])

describe('render boundary — a raw identity column never becomes customer text', () => {
    const identityUniverse = (): string[] =>
        execFileSync('git', ['ls-files', 'app', 'components', 'lib', 'hooks', 'contexts'], {
            cwd: REPO_ROOT,
            encoding: 'utf-8',
        })
            .split('\n')
            .filter((f) => /\.(ts|tsx)$/.test(f))
            .filter((f) => !/\/(admin|agent)\//.test(f))
            .filter((f) => existsSync(path.join(REPO_ROOT, f)))

    it('enumerates a real universe (a moved directory must not empty this guard)', () => {
        const files = identityUniverse()
        expect(files.length).toBeGreaterThan(400)
        expect(files.some((f) => f.startsWith('lib/'))).toBe(true)
        expect(files.some((f) => f.startsWith('components/'))).toBe(true)
    })

    it('no customer-facing file renders a raw identity column', () => {
        const offenders: string[] = []
        for (const file of identityUniverse()) {
            const source = readFileSync(path.join(REPO_ROOT, file), 'utf-8')
            let violations = scanIdentityRenderViolations(source)
            if (NOTIFICATION_BOUNDARY_FILES.has(file)) {
                violations = violations.filter((v) => v.rule === 'jsx_text')
            }
            if (INTERNAL_KEY_FILES.has(file)) {
                violations = violations.filter((v) => v.rule !== 'identity_pair')
            }
            if (AGENT_SURFACE_FILES.has(file) || MODEL_INPUT_FILES.has(file)) continue
            for (const v of violations) {
                offenders.push(`${file}:${v.line} [${v.rule}] ${v.snippet}`)
            }
        }
        expect(
            offenders,
            `These interpolate a raw insurerName/policyNumber into customer-visible text.\n` +
                `Route the value through lib/wallet/policy-identity (displayInsurerName / ` +
                `policyLabel / scrubPolicyIdentity) instead:\n  ${offenders.join('\n  ')}`
        ).toEqual([])
    })

    it('the notification boundary the sanction relies on still exists', () => {
        // (a) dispatch still scrubs both halves of every notification…
        const dispatch = readFileSync(path.join(REPO_ROOT, 'lib/notifications/dispatch.ts'), 'utf-8')
        expect(dispatch).toMatch(/redactPolicyPlaceholders\(resolveLocalized\(params\.title/)
        expect(dispatch).toMatch(/redactPolicyPlaceholders\(resolveLocalized\(params\.message/)
        // …and (b) every sanctioned file still routes through that boundary.
        for (const file of NOTIFICATION_BOUNDARY_FILES) {
            const source = readFileSync(path.join(REPO_ROOT, file), 'utf-8')
            expect(
                /import\s*\{[^}]*\b(?:emit|sendNotification|notifyCounterparty)\b[^}]*\}\s*from\s*["'][^"']*notifications/.test(
                    source
                ),
                `${file} is sanctioned as notification copy but no longer imports the ` +
                    `dispatch boundary — its templates would render unscrubbed`
            ).toBe(true)
        }
    })

    it('every agent-surface exemption still exists and still reads as one', () => {
        for (const [file] of AGENT_SURFACE_FILES) {
            expect(existsSync(path.join(REPO_ROOT, file)), `${file} exempted but gone`).toBe(true)
        }
    })
})

describe('render boundary — the matcher is proven against committed probes', () => {
    const probeSource = (name: string) => readFileSync(path.join(PROBES_DIR, name), 'utf-8')

    it('flags the JSX text render (rule 1 — the CoverageInsightsClient shape)', () => {
        const violations = scanIdentityRenderViolations(probeSource('identity-render-jsx.tsx.txt'))
        expect(violations.filter((v) => v.rule === 'jsx_text').length).toBeGreaterThanOrEqual(2)
        expect(violations.some((v) => v.fields.includes('insurerName'))).toBe(true)
        expect(violations.some((v) => v.fields.includes('policyNumber'))).toBe(true)
    })

    it('flags the aliased bilingual template (rule 2 — build.ts’s exact pre-fix shape)', () => {
        const probe = probeSource('identity-render-bilingual-alias.ts.txt')
        // Self-check: the probe genuinely reads the raw field and never a sanitizer.
        expect(probe).toContain('policy.insurerName?.trim()')
        expect(IDENTITY_SANITIZERS.test(probe)).toBe(false)
        const violations = scanIdentityRenderViolations(probe)
        const copy = violations.filter((v) => v.rule === 'bilingual_copy')
        // Both the el: and the en: line, through the `insurer` alias.
        expect(copy.length).toBeGreaterThanOrEqual(2)
        expect(copy.every((v) => v.fields.includes('insurerName'))).toBe(true)
    })

    it('flags the hand-built identity pair (rule 3 — the notifications/actions shape)', () => {
        const violations = scanIdentityRenderViolations(probeSource('identity-render-pair.ts.txt'))
        expect(violations.filter((v) => v.rule === 'identity_pair').length).toBe(1)
    })

    it('stays green on every legitimate shape — reads are not renders', () => {
        const probe = probeSource('identity-render-clean.tsx.txt')
        // Self-check: a gutted probe must not pass vacuously — the shapes that
        // most invite false positives are demonstrably still in the fixture.
        expect(probe).toContain('select: { insurerName: true')
        expect(probe).toContain('t.wallet.policyNumber')
        expect(probe).toMatch(/logActivity\(/)
        expect(probe).toContain('insurerName={policy.insurerName}')
        expect(scanIdentityRenderViolations(probe)).toEqual([])
    })
})

// ─────────────────────────────────────────────────────────────────────────────
// The defect itself, at the DOM: /timeline renders buildTimeline's titles
// verbatim, so the flow-through proof renders the REAL builder into the REAL
// component with a placeholder-identity policy. The positive assertions keep
// the probe from passing vacuously: the entry must still render, and a real
// insurer must still be named.
// ─────────────────────────────────────────────────────────────────────────────
import { buildTimeline } from '@/lib/services/timeline/build'
import { LifeTimeline } from '@/components/timeline/LifeTimeline'

describe('rendered output — the timeline never prints a placeholder identity', () => {
    const timelineFor = (insurerName: string) =>
        buildTimeline(
            {
                lifeEvents: [],
                renewals: [],
                recommendations: [],
                advisorActions: [],
                versions: [],
                policies: [
                    {
                        id: 'pol-timeline-1',
                        lineOfBusiness: 'motor',
                        insurerName,
                        createdAt: new Date('2026-08-01T00:00:00.000Z'),
                        startDate: new Date('2026-08-01T00:00:00.000Z'),
                        endDate: new Date('2027-08-01T00:00:00.000Z'),
                        status: 'active',
                    },
                ],
            },
            new Date('2026-08-20T12:00:00.000Z')
        ).map((entry) => ({ ...entry, at: entry.at.toISOString() }))

    it.each(SENTINELS.filter((s) => !s.startsWith('PENDING-')))(
        'renders the policy-added entry without leaking %s',
        (sentinel) => {
            const { container } = render(<LifeTimeline entries={timelineFor(sentinel)} language="el" />)
            const text = container.textContent || ''
            expectNoSentinel(text)
            // Flow-through: the entry RENDERED — the title degrades to the
            // branch label alone instead of disappearing or leaking.
            expect(text).toContain('Προστέθηκε ασφαλιστήριο')
        }
    )

    it('still names a real insurer in the same title', () => {
        const { container } = render(<LifeTimeline entries={timelineFor('Interamerican')} language="el" />)
        expect(container.textContent).toContain('Interamerican')
        expect(container.textContent).toContain('Προστέθηκε ασφαλιστήριο')
    })
})

// ─────────────────────────────────────────────────────────────────────────────
// S7 — the agent's upload form is a render sink too.
//
// The providers substitute `Unknown Insurer` / `PENDING-<epoch>` for an empty
// extraction on a SUCCESSFUL scan, and UploadPolicyModal pre-filled the raw
// values into the insurer / policy-number inputs. A pre-filled sentinel
// satisfies `required`, so the agent could commit «Unknown Insurer» as the
// policy's name. The inputs now go through scrubPolicyIdentity: a placeholder
// arrives EMPTY and `required` makes the agent type the real value.
// ─────────────────────────────────────────────────────────────────────────────
import { fireEvent, screen } from '@testing-library/react'
import { UploadPolicyModal } from '@/components/agent/UploadPolicyModal'
import { scanPolicyForResolution } from '@/app/(protected)/agent/actions'
import { el as elDict } from '@/lib/i18n/translations/el'

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn() } }))
vi.mock('@/app/(protected)/agent/actions', () => ({
    scanPolicyForResolution: vi.fn(),
    commitScannedPolicy: vi.fn(),
    requestAiConsent: vi.fn(),
}))

describe('rendered output — the agent upload form never pre-fills a placeholder identity', () => {
    const ac = elDict.agentModals.addCustomer
    const up = elDict.agentModals.uploadPolicy

    async function scanWith(extraction: Record<string, unknown>) {
        vi.mocked(scanPolicyForResolution).mockResolvedValue({
            success: true,
            extraction: { lineOfBusiness: 'motor', startDate: '2026-01-01', endDate: '2027-01-01', ...extraction },
            resolution: { candidates: [], conflict: false },
        } as any)
        const view = withProviders(
            <UploadPolicyModal isOpen onClose={vi.fn()} presetCustomerId="cust-1" presetCustomerConsent="attestable" />
        )
        // The dropzone is disabled until the pre-scan mandate attestation is ticked.
        fireEvent.click(screen.getByLabelText(up.preScanAttestation, { exact: false }))
        const input = document.getElementById('upload-policy-file') as HTMLInputElement
        Object.defineProperty(input, 'files', {
            value: [new File(['%PDF-1.4 test'], 'policy.pdf', { type: 'application/pdf' })],
            configurable: true,
        })
        fireEvent.change(input)
        await screen.findByText(up.confirmKicker)
        return view
    }

    it.each([
        ['provider substitution on a successful scan', { insurerName: 'Unknown Insurer', policyNumber: 'PENDING-1786732800000' }],
        ['wallet-form placeholder', { insurerName: '__PENDING_EXTRACTION__', policyNumber: 'PENDING-A1B2C3D4' }],
        ['Greek provider substitution', { insurerName: 'Άγνωστος ασφαλιστής', policyNumber: 'PENDING-9' }],
    ])('%s arrives empty, and the field stays required', async (_label, extraction) => {
        const { container } = await scanWith(extraction)
        const insurer = screen.getByLabelText(ac.insurer) as HTMLInputElement
        const number = screen.getByLabelText(ac.policyNumber) as HTMLInputElement
        expect(insurer.value).toBe('')
        expect(number.value).toBe('')
        expect(insurer.required).toBe(true)
        expect(number.required).toBe(true)
        // Nothing on the surface — text OR input values — carries a sentinel.
        expectNoSentinel(container.textContent || '')
        for (const field of Array.from(container.querySelectorAll('input'))) {
            expectNoSentinel(field.value)
        }
        // A sentinel identity cannot be committed: the submit stays disabled.
        expect((screen.getByText(up.submitAttach) as HTMLButtonElement).disabled).toBe(true)
    })

    it('a real identity is pre-filled untouched', async () => {
        await scanWith({ insurerName: 'Interamerican', policyNumber: 'POL-42' })
        expect((screen.getByLabelText(ac.insurer) as HTMLInputElement).value).toBe('Interamerican')
        expect((screen.getByLabelText(ac.policyNumber) as HTMLInputElement).value).toBe('POL-42')
    })
})
