import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

/**
 * H-027 (PW-CONTENT-02, owner decision 2026-10-22): the published agent caps are the
 * ANALYSIS COUNTS (5 / 50 / 150 / 400). A token is an internal metering unit and is
 * never shown to a customer — policyholder or agent. Enforcement is unchanged; only
 * the wording and the meter leave customer surfaces.
 *
 * Universe: every .ts/.tsx under the roots below, minus the admin tree (staff see
 * tokens) and API route handlers (their bodies are not rendered copy). A "string
 * that says tokens" is a quoted literal containing a space and the word token(s):
 * identifiers and query parameters (`"token"`, `/api/v1/tokens/usage`) have no space.
 */
const ROOTS = ['app', 'components', 'lib']
const EXCLUDED = [
    /^app\/\(protected\)\/admin\//,
    /^components\/admin\//,
    /^app\/api\//,
    /^lib\/admin\//,
    /^lib\/ai\//, // prompts to the model, never rendered
    /^lib\/legal\//, // reviewed legal text, separate guard
    /^app\/auth\//, // auth tokens (verify-email, reset, handover): a different word for a different thing
    /^lib\/auth\//,
    /^app\/api-docs\//, // developer documentation of endpoint paths
    /^lib\/ingestion\//, // internal metrics
    /^app\/\(public\)\/styleguide\//, // design tokens: a developer page, a different word
    /^lib\/services\/(ai|analysis)\//, // provider error matching, run failure messages stored for staff
    /^lib\/services\/push\.service\.ts$/, // OAuth/device push tokens
]
// Fragments allowed in otherwise-guarded files, each with the reason (queue item named).
// Scoped to the one file that holds them: a fragment allowed in the translation bundles is NOT allowed anywhere else.
const ALLOW_FRAGMENTS: Array<{ file: RegExp; fragment: RegExp; reason: string }> = [
    {
        file: /^lib\/i18n\/translations\/(el|en)\.ts$/,
        // The six EXACT strings of the dead referral block (el.ts:3325-3332, en.ts:3268-3275), anchored:
        // a new sentence in the bundle that merely contains one of these words is still caught.
        fragment: /^['"`](Share PolicyWallet with friends or customers\. When they upgrade to a paid plan, you earn credits for AI analyses\.|Credit Balance|"You helped someone — here is the value back\. Credits do not expire\."|Μοιραστείτε το PolicyWallet με φίλους ή πελάτες\. Όταν αναβαθμίσουν σε πληρωμένο πλάνο, κερδίζετε πιστώσεις για AI αναλύσεις\.|Υπόλοιπο πιστώσεων|"Βοηθήσατε κάποιον — εδώ είναι η αξία πίσω\. Οι πιστώσεις δεν λήγουν\.")['"`]$/,
        reason: 'dead referral copy: components/account/Referrals.tsx is not mounted (QUEUE REFERRAL-CREDITS-COPY)',
    },
]
// Reason-annotated exceptions: [path, why].
const ALLOW: Array<[RegExp, string]> = [
    [/^lib\/notifications\/registry\.ts$/, 'planned-only notification events (lib/notifications/registry.ts status "planned", no emitter): «Προστέθηκαν credits» cannot reach a customer today. If one goes live this entry must go (decide with TOKEN-TOPUP-UI-REMOVED)'],
    [/^lib\/token-/, 'internal metering module; strings are log/error text for staff'],
    [/^lib\/billing\/token-packages\.ts$/, 'internal package catalogue, no UI string'],
    [/^lib\/billing\.ts$/, 'Stripe-side product name of the token top-up; listed in HALTS.md (H-029) for the owner'],
]

// Exact strings that are allowed, with the reason. 'AI Tokens' is nav.aiTokens, rendered only in the
// admin sidebar (app/(protected)/layout.tsx, the admin block) — staff see tokens; customers do not.
const ALLOW_STRINGS = new Set(["'AI Tokens'"])

const TOKEN_STRING = /(["'`])(?:(?!\1)[^\n\\]|\\.)*[ \t](?:(?!\1)[^\n\\]|\\.)*\1/g

function walk(dir: string, out: string[] = []): string[] {
    for (const name of readdirSync(dir)) {
        const p = join(dir, name)
        if (statSync(p).isDirectory()) walk(p, out)
        else if (/\.(ts|tsx)$/.test(name)) out.push(p)
    }
    return out
}

function stripComments(src: string): string {
    return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1')
}

// The internal unit and the money that used to buy it: a customer reads neither.
const WORD = /\btokens?\b|\bcredits?\b|πιστώσε/i

export function tokenStrings(src: string, path = ''): string[] {
    const code = stripComments(src)
    // Quoted literals (template interpolations are removed first, so `Used ${n} tokens` is read as text).
    // A rendered sentence has no code punctuation in it; a mis-paired quote span does.
    const quoted = (code.match(TOKEN_STRING) ?? []).filter((s) => {
        const text = s.slice(1, -1).replace(/\$\{[^}]*\}/g, ' ')
        return WORD.test(text) && !/[(){};=]/.test(text) && !ALLOW_STRINGS.has(s)
    })
    // JSX text nodes: <p>Your remaining tokens</p>
    const jsx = [...code.matchAll(/>([^<>{}\n]*[A-Za-zΑ-Ωα-ω][^<>{}\n]*)</g)].map((m) => m[1]).filter((t) => WORD.test(t))
    return [...quoted, ...jsx].filter((t) => !ALLOW_FRAGMENTS.some((a) => a.file.test(path) && a.fragment.test(t)))
}

describe('no customer-facing string names tokens (H-027)', () => {
    it('customer surfaces never say "tokens"', () => {
        const files = ROOTS.flatMap((r) => walk(r)).filter(
            (f) => !EXCLUDED.some((re) => re.test(f)) && !ALLOW.some(([re]) => re.test(f)),
        )
        expect(files.length).toBeGreaterThan(400)
        const bad = files.flatMap((f) => tokenStrings(readFileSync(f, 'utf-8'), f).map((s) => `${f}: ${s.slice(0, 90)}`))
        expect(bad).toEqual([])
    })

    it('probe: the pattern turns red on token copy', () => {
        const probe = readFileSync('tests/fixtures/guard-probes/token-copy.ts.txt', 'utf-8')
        expect(tokenStrings(probe).length).toBeGreaterThanOrEqual(9)
    })

    it('the token meter component is not mounted on a customer surface', () => {
        const plan = readFileSync('components/settings/sections/PlanSection.tsx', 'utf-8')
        expect(plan).not.toMatch(/<TokenUsageCard/)
    })
})
