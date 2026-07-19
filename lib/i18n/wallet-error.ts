type WalletErrorContext =
    | "analysis"
    | "addPolicy"
    | "updatePolicy"
    | "deletePolicy"
    | "sharePolicy"
    | "revokeShare"
    | "question"
    | "batchUpload"
    | "copy"
    | "generic"

function normalizeError(error: unknown): string {
    if (typeof error === "string") return error
    if (error instanceof Error) return error.message
    return ""
}

function byContext(context: WalletErrorContext, t: any): string {
    if (context === "analysis") return t?.wallet?.errors?.analysisFailed || t?.analysis?.errors?.generic || t?.errors?.somethingWentWrong
    if (context === "addPolicy") return t?.wallet?.errors?.addFailed || t?.errors?.somethingWentWrong
    if (context === "updatePolicy") return t?.wallet?.errors?.updateFailed || t?.errors?.somethingWentWrong
    if (context === "deletePolicy") return t?.wallet?.errors?.deleteUnauthorized || t?.errors?.somethingWentWrong
    if (context === "sharePolicy") return t?.wallet?.errors?.shareFailed || t?.errors?.somethingWentWrong
    if (context === "revokeShare") return t?.wallet?.errors?.revokeFailed || t?.errors?.somethingWentWrong
    if (context === "question") return t?.wallet?.errors?.questionFailed || t?.wallet?.failedAnswer || t?.errors?.somethingWentWrong
    if (context === "batchUpload") return t?.wallet?.batchUpload?.saveFailed || t?.errors?.somethingWentWrong
    if (context === "copy") return t?.wallet?.errors?.copyFailed || t?.errors?.somethingWentWrong
    return t?.wallet?.errors?.generic || t?.errors?.somethingWentWrong
}

export function mapWalletErrorToMessage(
    error: unknown,
    t: any,
    context: WalletErrorContext = "generic"
): string {
    const message = normalizeError(error)
    const lower = message.toLowerCase()
    const upper = message.toUpperCase()

    if (upper.includes("AI_CONSENT_REQUIRED")) {
        return t?.common?.aiConsentRequired || byContext(context, t)
    }

    // Check before the generic UPGRADE_REQUIRED — "AGENT_UPGRADE_REQUIRED"
    // contains that substring but needs the agent-plan message.
    if (upper.includes("AGENT_UPGRADE_REQUIRED")) {
        return t?.analysis?.errors?.agentUpgradeRequired || byContext(context, t)
    }

    if (upper.includes("AGENT_ANALYSIS_LIMIT")) {
        return t?.wallet?.errors?.limitReached || byContext(context, t)
    }

    if (upper.includes("UPGRADE_REQUIRED")) {
        return t?.wallet?.errors?.upgradeRequired || byContext(context, t)
    }

    if (
        upper.includes("TOKEN_LIMIT_BLOCKED") ||
        lower.includes("monthly_limit_reached") ||
        lower.includes("insufficient_tokens")
    ) {
        return t?.analysis?.errors?.tokenLimit || t?.wallet?.errors?.tokenLimit || byContext(context, t)
    }

    if (upper.includes("LIMIT_REACHED")) {
        return t?.wallet?.errors?.limitReached || byContext(context, t)
    }

    if (
        upper.includes("POLICY_LIMIT") ||
        lower.includes("policy limit") ||
        lower.includes("feature_locked") ||
        lower.includes("upgrade")
    ) {
        return t?.wallet?.errors?.limitReached || byContext(context, t)
    }

    if (
        upper.includes("UNAUTHORIZED") ||
        lower.includes("access denied") ||
        lower.includes("forbidden")
    ) {
        return t?.wallet?.errors?.unauthorized || t?.errors?.unauthorized || byContext(context, t)
    }

    if (lower.includes("policy not found")) {
        return t?.wallet?.errors?.policyNotFound || byContext(context, t)
    }

    if (lower.includes("no active agent")) {
        return t?.wallet?.errors?.noActiveAgent || byContext(context, t)
    }

    if (
        upper.includes("SCHEMA") ||
        lower.includes("modelmessage[] schema") ||
        lower.includes("messages do not match") ||
        lower.includes("invalid prompt")
    ) {
        return t?.analysis?.errors?.schema || byContext(context, t)
    }

    if (upper.includes("TIMEOUT") || lower.includes("timeout") || lower.includes("deadline")) {
        return t?.analysis?.errors?.timeout || byContext(context, t)
    }

    if (upper.includes("DOCUMENT") || lower.includes("document")) {
        return t?.analysis?.errors?.document || byContext(context, t)
    }

    if (upper.includes("AUTH") && lower.includes("ai")) {
        return t?.analysis?.errors?.auth || byContext(context, t)
    }

    if (
        upper.includes("EXTERNAL_SERVICE") ||
        lower.includes("ai service is not configured") ||
        lower.includes("service unavailable")
    ) {
        return t?.analysis?.errors?.unavailable || t?.wallet?.errors?.aiUnavailable || byContext(context, t)
    }

    if (lower.includes("failed to process your question")) {
        return t?.wallet?.errors?.questionFailed || byContext(context, t)
    }

    if (lower.includes("copy")) {
        return t?.wallet?.errors?.copyFailed || byContext(context, t)
    }

    return byContext(context, t)
}
