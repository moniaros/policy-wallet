/**
 * The feature-flag catalog.
 *
 * CLIENT-SAFE: no server imports, no database, no `process.env` reads. This
 * module is the list of flags that EXIST; resolving what one currently says is
 * lib/flags/config.ts.
 *
 * ## Flags are declared here, not created by operators
 *
 * Every entry below already existed as an environment variable that some call
 * site reads. Nothing here is aspirational: if a flag is in this list, there is
 * a line of code whose behaviour it changes, and that line is named in
 * `readAt`. A console full of switches wired to nothing is worse than no
 * console, because it looks like control.
 *
 * The corollary is that an administrator cannot mint a new flag from the UI. A
 * flag whose key is not in this registry is inert on read — the same contract
 * notification rule overrides hold to, and for the same reason: the code has to
 * know what to do with it.
 *
 * ## Why `envVar` is still here
 *
 * The database layer sits IN FRONT of these variables, it does not replace
 * them. Precedence on read is DB row → env var → `defaultValue`. So an
 * unreadable database, or a key nobody has ever touched in the console, leaves
 * the product behaving exactly as it shipped — and the env var remains the
 * break-glass control that works even if the flags table is the thing that is
 * broken.
 */

/** How a flag's value is shaped. */
export type FlagKind = "boolean" | "canary"

/**
 * Audience for a staged rollout.
 *
 * This vocabulary is not invented here — it is the canary mode already
 * implemented in lib/services/analysis/remediation-policy.ts, reused so there
 * is one rollout dialect rather than two.
 *
 * - `off`      — nobody
 * - `internal` — admin/internal roles only
 * - `10`/`50`  — that percentage of users, bucketed by a stable hash of user id
 * - `100`      — everybody
 */
export type RolloutMode = "off" | "internal" | "10" | "50" | "100"

export const ROLLOUT_MODES: RolloutMode[] = ["off", "internal", "10", "50", "100"]

export interface FlagDefinition {
    key: string
    kind: FlagKind
    /** Human-readable name for the console. */
    label: string
    /** What turning this on actually does, in one sentence. */
    description: string
    /** Grouping in the console. */
    category: "ai" | "auth" | "extraction"
    /**
     * The environment variable this flag has been read from until now. Kept as
     * the fallback layer AND as the break-glass path when the database is the
     * thing that is unavailable.
     */
    envVar: string
    /** The behaviour with no row and no environment variable — what shipped. */
    defaultValue: boolean | RolloutMode
    /** Where the value is actually read. Keeps the registry honest. */
    readAt: string
    /**
     * True when switching this OFF degrades safety rather than a feature.
     * The console refuses to present these as casual toggles.
     */
    safetyCritical?: boolean
    /**
     * This flag is listed for visibility but CANNOT be changed from the
     * console — a database row for it is ignored on read.
     *
     * Listing it is still worth doing: an operator asking "is this on in
     * production?" gets a truthful answer instead of having to read the Vercel
     * environment. Pretending it were editable would be the lie.
     */
    envOnly?: boolean
    /** Why it cannot be moved into the database yet. Shown in the console. */
    envOnlyReason?: string
}

export const FEATURE_FLAGS: Record<string, FlagDefinition> = {
    "ai.failover_openai": {
        key: "ai.failover_openai",
        kind: "boolean",
        label: "OpenAI failover",
        description:
            "Allow a failing analysis step to retry on OpenAI instead of the primary provider.",
        category: "ai",
        envVar: "FF_AI_FAILOVER_OPENAI",
        defaultValue: false,
        readAt: "lib/services/analysis/remediation-policy.ts isOpenAIFailoverEnabled",
    },
    "ai.degraded_completion": {
        key: "ai.degraded_completion",
        kind: "boolean",
        label: "Degraded completion",
        description:
            "Let an analysis finish with a degradable step skipped rather than failing the whole run.",
        category: "ai",
        envVar: "FF_AI_DEGRADED_COMPLETION",
        defaultValue: true,
        readAt: "lib/services/analysis/remediation-policy.ts isDegradedCompletionEnabled",
    },
    "ai.remediation_alerts": {
        key: "ai.remediation_alerts",
        kind: "boolean",
        label: "Remediation alerting",
        description: "Page on terminal analysis failures that the remediation path could not rescue.",
        category: "ai",
        envVar: "FF_AI_REMEDIATION_ALERTS",
        defaultValue: false,
        readAt: "lib/services/analysis/remediation-policy.ts isRemediationAlertingEnabled",
    },
    "ai.full_failover": {
        key: "ai.full_failover",
        kind: "boolean",
        label: "Full failover allowed",
        description:
            "Permit failing over an entire analysis run, not just an individual step.",
        category: "ai",
        envVar: "AI_ALLOW_FULL_FAILOVER",
        defaultValue: true,
        readAt: "lib/services/analysis/remediation-policy.ts isFullFailoverAllowed",
    },
    "ai.remediation_canary": {
        key: "ai.remediation_canary",
        kind: "canary",
        label: "Remediation audience",
        description:
            "Who the AI remediation behaviours above apply to. Gates all four of them, so `off` disables remediation entirely regardless of the individual switches.",
        category: "ai",
        envVar: "FF_AI_REMEDIATION_CANARY_MODE",
        defaultValue: "internal",
        readAt: "lib/services/analysis/remediation-policy.ts isInCanary",
    },
    "auth.enforce_email_verification": {
        key: "auth.enforce_email_verification",
        kind: "boolean",
        label: "Enforce email verification",
        description:
            "Hard-gate the protected app on a verified email address. Off means an unverified account can still sign in.",
        category: "auth",
        envVar: "ENFORCE_EMAIL_VERIFICATION",
        defaultValue: false,
        readAt: "lib/auth-helpers.ts emailVerificationRequired",
        safetyCritical: true,
    },
    "auth.allow_registrations": {
        key: "auth.allow_registrations",
        kind: "boolean",
        label: "Allow new registrations",
        description:
            "Accept new self-serve accounts. Off shows a closed notice on signup and refuses every account-creation path; people an agent has already invited, and everyone who already has an account, are unaffected.",
        category: "auth",
        envVar: "ALLOW_REGISTRATIONS",
        // Absent, unset, or an unparseable value means OPEN — the behaviour
        // this product has always had. A registration gate that closed itself
        // on a typo would be a self-inflicted outage.
        defaultValue: true,
        readAt: "lib/auth/registration-gate.ts registrationsOpen",
        safetyCritical: true,
    },
    "extraction.citations": {
        key: "extraction.citations",
        kind: "boolean",
        label: "Extraction citations",
        description:
            "Record and surface the source span each extracted policy field came from.",
        category: "extraction",
        envVar: "EXTRACTION_CITATIONS",
        defaultValue: false,
        readAt: "lib/services/ai/extraction-citations.ts extractionCitationsEnabled",
        envOnly: true,
        envOnlyReason:
            "Read synchronously while building the extraction prompt and response schema (prompts.ts, extraction-schema.ts, mock-ai.service.ts). Reading it from the database would make prompt construction async — a change to the extraction contract on the money path, which does not belong in an admin-console change.",
    },
    "extraction.text_first": {
        key: "extraction.text_first",
        kind: "boolean",
        label: "Text-first extraction",
        description:
            "Send a text-native PDF to the extraction model as locally extracted, page-marked text instead of the whole file; scans and photos still send the image.",
        category: "extraction",
        envVar: "EXTRACTION_TEXT_FIRST",
        defaultValue: false,
        readAt: "lib/services/ai/extraction-input.ts extractionTextFirstEnabled",
        envOnly: true,
        envOnlyReason:
            "Read synchronously while the provider assembles the extraction request (extraction-input.ts). Same rollout dialect as extraction.citations: env-only, Gemini-first.",
    },
}

export const FLAG_KEYS = Object.keys(FEATURE_FLAGS)

export function flagDefinition(key: string): FlagDefinition | undefined {
    return FEATURE_FLAGS[key]
}

/** True when `value` is one of the five rollout modes. */
export function isRolloutMode(value: unknown): value is RolloutMode {
    return typeof value === "string" && (ROLLOUT_MODES as string[]).includes(value)
}
