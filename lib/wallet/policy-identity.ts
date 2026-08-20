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
