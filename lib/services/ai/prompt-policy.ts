/**
 * Prompt content policy — pure, dependency-light (no db, no env).
 *
 * Single source of truth for what admin-editable prompt content may contain.
 * Two consumers share it so they can never drift:
 *  - the admin save paths (gap checkCriteria, operator-guidance overrides)
 *    REJECT content that violates the policy before it is stored;
 *  - the evaluation scorer (evals/scorers/qa-compliance-scorer.ts) re-imports
 *    ADVICE_LANGUAGE to score model ANSWERS against the same ban.
 *
 * Why this is strict: the AI persona is a compliance constraint, not a style
 * choice — «ασφαλιστικός σύμβουλος» is a licensed IDD role (ν. 4583/2018), and
 * the informational-assistant framing is pinned by unit tests. Admin-supplied
 * prompt content is additive operator guidance; it must not be able to recast
 * the persona, smuggle advice language, or forge the spotlight delimiters that
 * fence untrusted document data.
 */

import { stripSpotlightDelimiters } from "./spotlight"
import { sanitizeText, scoreInjection } from "./guard"
import { BLOCK_THRESHOLD } from "./guard-patterns"

/**
 * Advice-language patterns that should never appear in an informational answer
 * — or in admin-authored prompt content (it would instruct the model to advise).
 * EN + EL. Moved here from evals/scorers/qa-compliance-scorer.ts, which
 * re-exports this exact array.
 */
export const ADVICE_LANGUAGE: RegExp[] = [
    /\byou should (buy|purchase|get|cancel|switch|claim|drop|add)\b/i,
    /\bwe recommend\b/i,
    /\bI recommend\b/i,
    /\byou (ought|need) to (buy|cancel|claim)\b/i,
    // Greek: "you should / I suggest you [buy|cancel|change|claim]". The `u`
    // flag gives correct Greek case folding; the gap allows an intervening "να".
    /(θα πρέπει να|σου προτείνω|σας προτείνω|προτείν\w* να)[^.]{0,20}(αγοράσ|αγορά|ακυρώσ|αλλάξ|κάνεις αίτηση)/iu,
]

/**
 * Attempts to recast the model into the regulated adviser role, or to override
 * the canonical instructions. Any match rejects the content outright.
 */
export const PERSONA_OVERRIDE_PATTERNS: RegExp[] = [
    /insurance advisor/i,
    /ασφαλιστικ(ός|ή|ούς)\s+σύμβουλ/iu,
    /\byou are now\b/i,
    /ignore (all |the )?(previous |above )?(rules|instructions)/i,
]

export const MAX_GUIDANCE_CHARS = 4000

export type GuidanceValidation = { ok: true } | { ok: false; errors: string[] }

/**
 * Validate admin-authored prompt content before it is stored. Collects every
 * violation (not just the first) so the editor can show them all at once.
 * Rejection is preferred over silent sanitization — what is stored must be
 * exactly what the admin sees.
 */
export function validateOperatorGuidance(
    text: string,
    opts: { maxChars?: number } = {}
): GuidanceValidation {
    const maxChars = opts.maxChars ?? MAX_GUIDANCE_CHARS
    const errors: string[] = []
    const value = text ?? ""

    if (value.trim().length === 0) {
        errors.push("Guidance must not be empty.")
    }
    if (value.length > maxChars) {
        errors.push(`Guidance exceeds ${maxChars} characters (${value.length}).`)
    }
    if (stripSpotlightDelimiters(value) !== value) {
        errors.push(
            "Guidance contains reserved prompt delimiters (e.g. </untrusted_policy_data>, <|im_start|>) — remove them."
        )
    }
    for (const pattern of ADVICE_LANGUAGE) {
        if (pattern.test(value)) {
            errors.push(`Guidance contains banned advice language (${pattern}). The assistant is informational and must not tell users what to buy, cancel or claim.`)
        }
    }
    for (const pattern of PERSONA_OVERRIDE_PATTERNS) {
        if (pattern.test(value)) {
            errors.push(`Guidance attempts to override the assistant persona or its rules (${pattern}).`)
        }
    }
    const { score, patternIds } = scoreInjection(sanitizeText(value).toLowerCase())
    if (score >= BLOCK_THRESHOLD) {
        errors.push(`Guidance matches prompt-injection patterns (${patternIds.join(", ")}).`)
    }

    return errors.length === 0 ? { ok: true } : { ok: false, errors }
}
