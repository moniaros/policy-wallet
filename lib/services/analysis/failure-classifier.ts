export type FailureClass =
    | "transient"
    | "schema"
    | "token"
    | "document"
    | "auth"
    | "unknown"

export type OperatorSeverity = "info" | "warn" | "error"

export interface ClassifiedFailure {
    failureClass: FailureClass
    retryable: boolean
    shouldFailoverProvider: boolean
    userMessageKey: string
    operatorSeverity: OperatorSeverity
    code: string
}

type UnknownRecord = Record<string, unknown>

type ErrorSnapshot = {
    message: string
    messageLower: string
    code: string | null
    codeLower: string
    name: string | null
    nameLower: string
    status: number | null
}

function hasAny(haystack: string, needles: string[]): boolean {
    return needles.some((needle) => haystack.includes(needle))
}

function toRecord(value: unknown): UnknownRecord | null {
    if (!value || typeof value !== "object") return null
    return value as UnknownRecord
}

function readString(value: unknown): string | null {
    if (typeof value !== "string") return null
    const normalized = value.trim()
    return normalized.length > 0 ? normalized : null
}

function readNumber(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value)) return value
    if (typeof value === "string" && value.trim().length > 0) {
        const parsed = Number(value)
        return Number.isFinite(parsed) ? parsed : null
    }
    return null
}

function extractStatus(candidates: Array<UnknownRecord | null>, messageLower: string): number | null {
    for (const candidate of candidates) {
        if (!candidate) continue
        const status =
            readNumber(candidate.status) ??
            readNumber(candidate.statusCode) ??
            readNumber(candidate.httpStatus) ??
            readNumber(candidate.httpStatusCode)
        if (status !== null) return status
    }

    const match = messageLower.match(/\b(401|403|408|409|422|429|500|502|503|504)\b/)
    if (!match) return null

    const parsed = Number(match[1])
    return Number.isFinite(parsed) ? parsed : null
}

function getErrorSnapshot(error: unknown): ErrorSnapshot {
    const fallbackMessage = error instanceof Error ? error.message : String(error ?? "")
    const top = toRecord(error)
    const cause = toRecord(top?.cause)
    const response = toRecord(top?.response)
    const responseError = toRecord(response?.error)

    const message =
        readString(top?.message) ||
        readString(cause?.message) ||
        readString(responseError?.message) ||
        readString(response?.statusText) ||
        fallbackMessage ||
        "Unknown analysis error"

    const code =
        readString(top?.code) ||
        readString(cause?.code) ||
        readString(responseError?.code) ||
        readString(top?.type) ||
        null

    const name = readString(top?.name) || readString(cause?.name) || null
    const messageLower = message.toLowerCase()

    return {
        message,
        messageLower,
        code,
        codeLower: (code || "").toLowerCase(),
        name,
        nameLower: (name || "").toLowerCase(),
        status: extractStatus([top, cause, response, responseError], messageLower),
    }
}

export function classifyAnalysisFailure(error: unknown): ClassifiedFailure {
    const snapshot = getErrorSnapshot(error)
    const msg = snapshot.messageLower
    const code = snapshot.codeLower

    if (
        hasAny(code, [
            "monthly_limit_reached",
            "insufficient_tokens",
            "token_limit_blocked",
            "quota_exceeded",
            "billing_hard_limit_reached",
        ]) ||
        hasAny(msg, [
            "monthly_limit_reached",
            "insufficient_tokens",
            "token_limit_blocked",
            "token budget check failed",
        ])
    ) {
        return {
            failureClass: "token",
            retryable: false,
            shouldFailoverProvider: false,
            userMessageKey: "analysis.errors.tokenLimit",
            operatorSeverity: "warn",
            code: "TOKEN_LIMIT_BLOCKED",
        }
    }

    if (
        snapshot.status === 401 ||
        snapshot.status === 403 ||
        hasAny(code, [
            "unauthorized",
            "forbidden",
            "permission_denied",
            "invalid_api_key",
            "authentication_error",
            "auth_error",
        ]) ||
        hasAny(snapshot.nameLower, ["authenticationerror", "authorizationerror"]) ||
        hasAny(msg, [
            "unauthorized",
            "forbidden",
            "access denied",
            "authentication failed",
            "invalid api key",
            "permission denied",
        ])
    ) {
        return {
            failureClass: "auth",
            retryable: false,
            shouldFailoverProvider: false,
            userMessageKey: "analysis.errors.auth",
            operatorSeverity: "error",
            code: "AUTH_ERROR",
        }
    }

    if (
        hasAny(code, [
            "ai_capability_unsupported_model",
        ]) ||
        hasAny(msg, [
            "model",
            "not supported by provider",
        ]) && hasAny(msg, ["capability check failed"])
    ) {
        return {
            failureClass: "schema",
            retryable: false,
            shouldFailoverProvider: true,
            userMessageKey: "analysis.errors.unavailable",
            operatorSeverity: "warn",
            code: "AI_CAPABILITY_UNSUPPORTED_MODEL",
        }
    }

    if (
        hasAny(code, [
            "schema_mismatch",
            "schema_validation",
            "invalid_prompt",
            "invalid_response_format",
            "json_parse_error",
        ]) ||
        hasAny(msg, [
            "modelmessage[] schema",
            "messages do not match",
            "invalid prompt",
            "json schema",
            "failed to parse",
            "zod",
            "json",
            "no object generated",
        ])
    ) {
        return {
            failureClass: "schema",
            retryable: true,
            shouldFailoverProvider: true,
            userMessageKey: "analysis.errors.schema",
            operatorSeverity: "warn",
            code: "SCHEMA_MISMATCH",
        }
    }

    if (
        hasAny(code, [
            "missing_document",
            "document_load_failed",
            "document_error",
            "invalid_file",
            "unsupported_mime",
            "ai_capability_unsupported_mime",
        ]) ||
        hasAny(msg, [
            "no policy document uploaded",
            "missing document",
            "failed to fetch document",
            "failed to read document",
            "document load failed",
            "document storage",
            "invalid file",
            "unsupported mime",
            "corrupt pdf",
        ])
    ) {
        return {
            failureClass: "document",
            retryable: false,
            shouldFailoverProvider: false,
            userMessageKey: "analysis.errors.document",
            operatorSeverity: "warn",
            code: "DOCUMENT_ERROR",
        }
    }

    if (
        snapshot.status === 408 ||
        snapshot.status === 429 ||
        snapshot.status === 500 ||
        snapshot.status === 502 ||
        snapshot.status === 503 ||
        snapshot.status === 504 ||
        hasAny(code, [
            "rate_limit",
            "rate_limited",
            "timeout",
            "timed_out",
            "etimedout",
            "econnreset",
            "econnrefused",
            "service_unavailable",
            "temporarily_unavailable",
            "overloaded",
        ]) ||
        hasAny(msg, [
            "timeout",
            "timed out",
            "deadline",
            "aborted",
            "503",
            "500",
            "429",
            "service unavailable",
            "temporarily",
            "overloaded",
        ])
    ) {
        return {
            failureClass: "transient",
            retryable: true,
            shouldFailoverProvider: true,
            userMessageKey: "analysis.errors.timeout",
            operatorSeverity: "warn",
            code: "TRANSIENT_FAILURE",
        }
    }

    return {
        failureClass: "unknown",
        retryable: false,
        shouldFailoverProvider: false,
        userMessageKey: "analysis.errors.generic",
        operatorSeverity: "error",
        code: "UNKNOWN_FAILURE",
    }
}
