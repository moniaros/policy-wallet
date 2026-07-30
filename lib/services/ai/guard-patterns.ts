/**
 * Deterministic prompt-injection / jailbreak pattern set.
 *
 * The blocking path must cost ZERO provider tokens, so detection is pure
 * regex/phrase scoring — never a model call. Each pattern carries a weight;
 * guard.ts sums the weights of the matches and applies two thresholds:
 *   score >= BLOCK_THRESHOLD  -> reject before any AI call (€0)
 *   score in [FLAG..BLOCK)    -> allow, but log AI_INPUT_FLAGGED so the admin
 *                                dashboard can measure attack pressure before
 *                                we tighten the bar.
 *
 * Patterns are bilingual (English + Greek) because the product is Greek-first.
 * They are intentionally high-precision: a false block is a user typing a
 * legitimate question who gets told "rephrase", so weights are tuned so that a
 * single strong instruction-override phrase blocks, while softer role-play
 * language only flags.
 */

export interface InjectionPattern {
    id: string
    /** Compiled per call against the lower-cased, normalized text. */
    test: RegExp
    weight: number
}

/** score >= this rejects the input before any provider call. */
export const BLOCK_THRESHOLD = 6
/** score >= this logs AI_INPUT_FLAGGED but still allows the call. */
export const FLAG_THRESHOLD = 3

/**
 * High-confidence instruction-override and prompt-exfiltration patterns
 * (weight >= 6 — a single match blocks). Kept deliberately specific: these are
 * phrases with essentially no legitimate use inside a policy question.
 */
export const HIGH_CONFIDENCE_PATTERNS: InjectionPattern[] = [
    // "ignore/disregard/forget (all) (the) previous/above/prior instructions"
    { id: "override-instructions-en", weight: 6, test: /\b(ignore|disregard|forget|override)\b[^.]{0,40}\b(previous|above|prior|earlier|all)\b[^.]{0,20}\b(instruction|instructions|prompt|prompts|rule|rules|context)\b/i },
    // Greek: «αγνόησε/ξέχνα/παράβλεψε τις (προηγούμενες/παραπάνω) οδηγίες»
    { id: "override-instructions-el", weight: 6, test: /(αγνόησε|αγνοησε|ξέχνα|ξεχνα|παράβλεψε|παραβλεψε)[^.]{0,40}(προηγούμεν|προηγουμεν|παραπάνω|παραπανω|όλες|ολες)[^.]{0,20}(οδηγί|οδηγι|εντολ|κανόν|κανον)/i },
    // "reveal/show/print/repeat your system prompt / instructions"
    { id: "exfiltrate-system-prompt-en", weight: 6, test: /\b(reveal|show|print|repeat|display|output|tell me|give me)\b[^.]{0,30}\b(your|the)\b[^.]{0,20}\b(system prompt|system message|instructions|prompt|directives|guidelines)\b/i },
    // Greek: «δείξε/τύπωσε/πες μου το system prompt / τις οδηγίες σου»
    { id: "exfiltrate-system-prompt-el", weight: 6, test: /(δείξε|δειξε|τύπωσε|τυπωσε|πες μου|εμφάνισε|εμφανισε|αποκάλυψε|αποκαλυψε)[^.]{0,30}(system prompt|συστήματος|συστηματος|οδηγίες σου|οδηγιες σου|εντολές σου|εντολες σου)/i },
    // Jailbreak persona toggles
    { id: "jailbreak-persona", weight: 6, test: /\b(dan mode|developer mode|do anything now|jailbreak|without any restrictions|ignore your (guidelines|guardrails|safety))\b/i },
    // Delimiter / chat-template forgery — attacker trying to close our data
    // envelope or open a fake system turn.
    { id: "delimiter-forgery", weight: 6, test: /<\|(im_start|im_end|system|user|assistant)\|>|\[\/?INST\]|<\/?(untrusted_policy_data|user_question|system)>|```+\s*system\b/i },
    // "you are now (a/an) ... assistant/model that ..." — role reassignment
    { id: "role-reassign-en", weight: 6, test: /\byou are now\b[^.]{0,40}\b(assistant|model|ai|bot|system|advisor|unrestricted)\b/i },
]

/**
 * Medium-signal patterns (weight 3-5 — one alone only flags, two combine to
 * block). These have occasional legitimate uses, so they never block on their
 * own.
 */
export const MEDIUM_SIGNAL_PATTERNS: InjectionPattern[] = [
    { id: "pretend-act-as-en", weight: 4, test: /\b(pretend (you are|to be)|act as|roleplay as|imagine you are)\b/i },
    { id: "pretend-act-as-el", weight: 4, test: /(προσποιήσου|προσποιησου|κάνε πως είσαι|κανε πως εισαι|υποδύσου|υποδυσου)/i },
    { id: "new-instructions-en", weight: 4, test: /\b(new instructions?|updated instructions?|the real (task|instruction)|instead,? (do|answer|respond))\b\s*:?/i },
    { id: "system-override-en", weight: 3, test: /\b(system\s*[:=]|from now on you (will|must|should)|your new (role|task|goal) is)\b/i },
    // A large base64-looking blob smuggled into a free-text question is a common
    // payload-hiding technique; harmless questions don't carry them.
    { id: "embedded-base64", weight: 3, test: /[A-Za-z0-9+/]{256,}={0,2}/ },
]
