/**
 * The single owner of "this policy has no real identity yet".
 *
 * A policy row is created BEFORE extraction knows the insurer or the policy
 * number, so those NOT NULL columns are filled with placeholders. Three
 * separate layers mint them:
 *
 *   1. the wallet add form, when the optional fields are left blank
 *      (`__PENDING_EXTRACTION__`, `PENDING-<epoch>`)
 *   2. `PolicyService.uploadAndParse`, for the single-file upload path
 *      (`AI Analyzing...`, `PENDING-<uuid8>`)
 *   3. the AI providers themselves, which substitute `Unknown Insurer` /
 *      `PENDING-<epoch>` for an empty extraction — on a SUCCESSFUL run. A
 *      policy whose PDF simply never printed its number therefore carries a
 *      placeholder as its final, permanent value.
 *
 * Because of (3) a placeholder is not only a failure artifact, and cleaning up
 * failed policies does not make these strings unreachable. They have to be
 * unrenderable at the display layer too.
 *
 * Every screen used to re-implement the check inline, so each new screen
 * shipped with the hole open again — the wallet notice list rendered
 * "Αυτοκίνητο · __PENDING_EXTRACTION__" to a customer. This module is the only
 * place allowed to know the literals; `tests/unit/policy-sentinels-unrenderable.test.tsx`
 * fails the build if another file learns them.
 */

/** Insurer-name placeholders, in every form any layer has ever written. */
export const PLACEHOLDER_INSURER_NAMES: readonly string[] = [
    '__PENDING_EXTRACTION__',
    'AI Analyzing...',
    'Unknown Insurer',
    // The Greek rendering the provider prompt occasionally returns instead of
    // the English one.
    'Άγνωστος ασφαλιστής',
]

/** Every synthetic policy number starts with this. */
export const PLACEHOLDER_POLICY_NUMBER_PREFIX = 'PENDING-'

/**
 * Every literal a rendered surface must never contain. Used by the guard test
 * and by {@link containsPlaceholderText}.
 */
export const POLICY_IDENTITY_PLACEHOLDERS: readonly string[] = [
    ...PLACEHOLDER_INSURER_NAMES,
    PLACEHOLDER_POLICY_NUMBER_PREFIX,
]

function normalized(value: string | null | undefined): string {
    return String(value ?? '').trim()
}

export function isPlaceholderInsurerName(value: string | null | undefined): boolean {
    const text = normalized(value)
    if (!text) return true
    return PLACEHOLDER_INSURER_NAMES.some(
        (placeholder) => placeholder.toLowerCase() === text.toLowerCase()
    )
}

export function isPlaceholderPolicyNumber(value: string | null | undefined): boolean {
    const text = normalized(value)
    if (!text) return true
    return text.toUpperCase().startsWith(PLACEHOLDER_POLICY_NUMBER_PREFIX)
}

/**
 * True when NOTHING about this policy's identity came from a human — both the
 * insurer and the number are placeholders.
 *
 * This is the discard predicate. A policy an agent typed an insurer into holds
 * real work and is never thrown away on a provider timeout; a policy that is
 * pure placeholder holds nothing a re-upload would not reproduce.
 */
export function hasPlaceholderIdentity(policy: {
    insurerName?: string | null
    policyNumber?: string | null
}): boolean {
    return (
        isPlaceholderInsurerName(policy.insurerName) &&
        isPlaceholderPolicyNumber(policy.policyNumber)
    )
}

/** Does this already-composed string leak a placeholder to the user? */
export function containsPlaceholderText(value: string | null | undefined): boolean {
    const text = normalized(value)
    if (!text) return false
    return POLICY_IDENTITY_PLACEHOLDERS.some((placeholder) =>
        text.toUpperCase().includes(placeholder.toUpperCase())
    )
}

/**
 * The insurer name to show, or `fallback` (a localized branch label, the
 * uploaded file name — the caller owns the wording, this module owns the
 * decision). Returns `''` when there is nothing safe to show, so a bare
 * `{displayInsurerName(x)}` renders empty rather than a sentinel.
 */
export function displayInsurerName(
    value: string | null | undefined,
    fallback?: string | null
): string {
    if (isPlaceholderInsurerName(value)) return normalized(fallback)
    return normalized(value)
}

/**
 * The policy number to show, or `null`. Never a fallback: an invented number
 * next to a real insurer reads as data, and a wrong policy number is worse
 * than a missing one.
 */
export function displayPolicyNumber(value: string | null | undefined): string | null {
    if (isPlaceholderPolicyNumber(value)) return null
    return normalized(value)
}

/**
 * An uploaded file name, tidied into something usable as a label — the
 * fallback the customer actually recognizes when extraction produced no
 * insurer ("ΑΣΦΑΛΙΣΤΗΡΙΟ 2026.pdf" → "ΑΣΦΑΛΙΣΤΗΡΙΟ 2026"). Returns `''` for
 * nothing usable so it composes with {@link displayInsurerName}.
 */
export function fileNameLabel(fileName: string | null | undefined): string {
    const text = normalized(fileName)
    if (!text) return ''
    return text.replace(/\.[A-Za-z0-9]{1,8}$/, '').replace(/[_-]+/g, ' ').trim()
}

export interface PolicyIdentityView {
    /** Safe insurer label — `fallback` when the stored value is a placeholder. */
    insurerName: string
    /** Safe policy number, or `null`. */
    policyNumber: string | null
    /** True when either half is still a placeholder (drives "analyzing" hints). */
    isPending: boolean
}

export function policyIdentityView(
    policy: { insurerName?: string | null; policyNumber?: string | null },
    fallback?: string | null
): PolicyIdentityView {
    return {
        insurerName: displayInsurerName(policy.insurerName, fallback),
        policyNumber: displayPolicyNumber(policy.policyNumber),
        isPending:
            isPlaceholderInsurerName(policy.insurerName) ||
            isPlaceholderPolicyNumber(policy.policyNumber),
    }
}

/**
 * "Interamerican (POL-123)" / "Interamerican" / "POL-123" / `fallback`.
 * The one way to name a policy inside a sentence.
 */
export function policyLabel(
    policy: { insurerName?: string | null; policyNumber?: string | null },
    fallback = ''
): string {
    const insurer = displayInsurerName(policy.insurerName)
    const number = displayPolicyNumber(policy.policyNumber)
    if (insurer && number) return `${insurer} (${number})`
    return insurer || number || normalized(fallback)
}

/**
 * Last-resort scrub for an ALREADY-COMPOSED user-facing sentence.
 *
 * Applied inside `emit()` to every notification title and message, so a
 * message template that interpolates a raw column cannot leak a placeholder
 * even if it forgot to call {@link policyLabel}. Prose, not data — it removes
 * the token and tidies the punctuation left behind ("Policy PENDING-1 (Unknown
 * Insurer) was analyzed" → "Policy was analyzed").
 */
export function redactPolicyPlaceholders(text: string): string {
    if (!text) return text

    let out = text
    for (const placeholder of PLACEHOLDER_INSURER_NAMES) {
        out = out.split(placeholder).join('')
    }
    out = out.replace(/PENDING-[A-Za-z0-9]+/g, '')

    return out
        // "( )" and "()" left where an identity used to be
        .replace(/\(\s*\)/g, '')
        // a separator with nothing on one side of it
        .replace(/\s*[·•]\s*(?=[·•])/g, '')
        .replace(/\s{2,}/g, ' ')
        .replace(/\s+([,.;:!?])/g, '$1')
        .replace(/^[\s·•\-—]+|[\s·•\-—]+$/g, '')
        .trim()
}

// ── Person display names ─────────────────────────────────────────────────────
//
// The same defect class as the policy sentinels, one column over. `User.name`
// can hold values no layer ever meant a human to read as a name:
//
//   1. test fixtures ("E2E Policyholder", "e2e-ph-free" — tests/e2e-users.ts),
//      which exist in the dev database and greeted a signed-in owner with
//      «Καλώς ήρθατε πίσω, E2E!» (transformation candidate #6)
//   2. the signup defaults app/auth/actions.ts mints when no name was given:
//      "Agent User" and `Policyholder <last-4-digits>`
//   3. bare test tokens left by seeds ("Test", "Demo User")
//
// This module is the only place allowed to know these shapes, same rule as the
// policy placeholders above. A synthetic name renders as NOTHING — the caller
// falls back to honest copy (an un-personalised greeting, the account email, a
// role label) rather than a blank or an invented name.

/** Every synthetic person-name shape any layer writes, enumerated once. */
export const SYNTHETIC_PERSON_NAME_PATTERNS: readonly RegExp[] = [
    // Test fixtures: a standalone E2E token anywhere in the name
    // ("E2E Policyholder", "E2E Admin", "e2e-ph-free").
    /(?:^|\s)e2e(?:$|[\s\-_.@])/i,
    // Signup default for phone-only registrations: "Policyholder 1234".
    /^policyholder(?:\s|$)/i,
    // Signup default for agents who left the name blank.
    /^agent user$/i,
    // Bare test tokens. Whole-name matches only: "Maria Demopoulos" is a
    // person, "Demo User" is not.
    /^(?:test|demo|fixture|sample)(?:[\s\-_.](?:user|account|customer|agent))?$/i,
    // A fixture email address standing in for a name.
    /@policywallet\.test$/i,
]

/**
 * A fixture identifier embedded in PROSE ("…στο ασφαλιστήριο E2E-PDM-MOT-ACT»).
 * `#` is excluded on the left and digits on the right so hex colours
 * (`#E2E8F0`) never match; a real Greek or Latin word never contains a
 * standalone `e2e` token.
 */
const FIXTURE_IDENTIFIER_SOURCE =
    '(?<![\\p{L}\\p{N}#])e2e(?:[-_.@][\\p{L}\\p{N}][\\p{L}\\p{N}\\-_.@]*)*(?![\\p{L}\\p{N}])'

/** Does composed prose contain a fixture identifier (E2E, e2e-mot-001, …)? */
export function containsFixtureIdentifier(text: string | null | undefined): boolean {
    const value = String(text ?? '')
    if (!value) return false
    return new RegExp(FIXTURE_IDENTIFIER_SOURCE, 'iu').test(value)
}

/** Is this stored display name synthetic — a fixture or a signup default? */
export function isSyntheticPersonName(value: string | null | undefined): boolean {
    const text = normalized(value)
    if (!text) return true
    return SYNTHETIC_PERSON_NAME_PATTERNS.some((pattern) => pattern.test(text))
}

/**
 * The person name to show, or `fallback` (the caller owns the wording — an
 * email address, a role label, or nothing so the surrounding copy degrades to
 * its un-personalised form). Returns `''` when there is nothing safe to show,
 * so a bare `{displayPersonName(x)}` renders empty rather than a fixture token.
 */
export function displayPersonName(
    value: string | null | undefined,
    fallback?: string | null
): string {
    const text = normalized(value)
    if (
        !text ||
        isSyntheticPersonName(text) ||
        containsPlaceholderText(text) ||
        containsFixtureIdentifier(text)
    ) {
        return normalized(fallback)
    }
    return text
}

/**
 * The first name for a greeting («Καλώς ήρθατε πίσω, Νίκος!»), or `''` when
 * the stored name is synthetic or absent — the greeting then omits the name
 * entirely rather than greeting "E2E" or "Policyholder".
 */
export function firstNameLabel(value: string | null | undefined): string {
    return displayPersonName(value).split(/\s+/)[0] || ''
}

/** Remove fixture identifiers from an already-composed sentence. */
function stripFixtureIdentifiers(text: string): string {
    return text.replace(new RegExp(FIXTURE_IDENTIFIER_SOURCE, 'giu'), '')
}

/**
 * Prose scrub for a composed user-facing sentence: policy placeholders AND
 * fixture identifiers, with the punctuation tidy-up of
 * {@link redactPolicyPlaceholders}.
 */
export function scrubRenderableText(text: string): string {
    if (!text) return text
    return redactPolicyPlaceholders(stripFixtureIdentifiers(text))
}

/**
 * §6.1.3 — the boundary assertion. Call it on composed text at the last shared
 * point before it leaves for a customer (the notification email shell does).
 *
 * Development and test FAIL LOUDLY: a sentinel or fixture identifier reaching
 * this point is an upstream defect, and rendering it quietly is how
 * «PENDING-1786738708923 (__PENDING_EXTRACTION__)» reached outbound email.
 * Production DEGRADES HONESTLY: it scrubs, logs, and never crashes a page or a
 * send for a customer.
 */
export function assertRenderableText(text: string, context: string): string {
    if (!text) return text
    const leaks: string[] = []
    if (containsPlaceholderText(text)) leaks.push('a policy-identity placeholder')
    if (containsFixtureIdentifier(text)) leaks.push('a fixture identifier')
    if (leaks.length === 0) return text

    if (process.env.NODE_ENV !== 'production') {
        throw new Error(
            `[policy-identity] ${context} would render ${leaks.join(' and ')}: «${text}». ` +
                'Route the value through lib/wallet/policy-identity before it reaches a customer.'
        )
    }
    console.error(
        `[policy-identity] ${context} received ${leaks.join(' and ')}; rendered the scrubbed text instead.`
    )
    return scrubRenderableText(text)
}

/**
 * Return a copy of a policy-shaped object with its identity columns made safe
 * for rendering. Applied at the server read boundaries that hand policies to
 * client components, so a component cannot render a sentinel even if it
 * interpolates the field directly.
 *
 * `policyNumber` becomes `''` rather than `null` — the field is typed
 * non-nullable across most of the UI, and an empty string renders as nothing.
 */
export function scrubPolicyIdentity<
    T extends { insurerName?: string | null; policyNumber?: string | null },
>(policy: T, fallbackInsurer?: string | null): T {
    return {
        ...policy,
        ...(policy.insurerName !== undefined
            ? { insurerName: displayInsurerName(policy.insurerName, fallbackInsurer) }
            : {}),
        ...(policy.policyNumber !== undefined
            ? { policyNumber: displayPolicyNumber(policy.policyNumber) ?? '' }
            : {}),
    }
}
