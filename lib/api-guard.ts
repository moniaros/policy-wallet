import { createApiError } from "@/lib/api-utils"
import { type ApiAuthResult, type AppRole, requireApiUser } from "@/lib/api-auth"
import { rateLimit } from "@/lib/rate-limit"
import type { ZodType } from "zod"

type NextRouteContext = { params?: Promise<Record<string, unknown>> | Record<string, unknown> }

type WebhookVerifier<TContext> = (args: {
    req: Request
    context: TContext
    ip: string
}) => Promise<Response | null> | Response | null

type AuthMode<TContext> =
    | { mode: "public" }
    | { mode: "user"; roles?: AppRole[] }
    | { mode: "webhook"; verify: WebhookVerifier<TContext> }

type ValidationConfig<TParams, TQuery, TBody> = {
    params?: ZodType<TParams>
    query?: ZodType<TQuery>
    body?: ZodType<TBody>
}

type RateLimitConfig<TContext, TParams, TQuery, TBody> = {
    limit: number
    windowMs: number
    key: (args: {
        req: Request
        context: TContext
        ip: string
        auth: ApiAuthResult | null
        roles: AppRole[]
        params: TParams
        query: TQuery
        body: TBody | undefined
    }) => string
}

type WithApiGuardOptions<TContext, TParams, TQuery, TBody> = {
    auth: AuthMode<TContext>
    validation?: ValidationConfig<TParams, TQuery, TBody>
    rateLimit?: RateLimitConfig<TContext, TParams, TQuery, TBody>
    errors?: {
        invalidParams?: string
        invalidQuery?: string
        invalidBody?: string
    }
}

type GuardHandlerArgs<TContext, TParams, TQuery, TBody> = {
    req: Request
    context: TContext
    ip: string
    auth: ApiAuthResult | null
    roles: AppRole[]
    params: TParams
    query: TQuery
    body: TBody | undefined
}

const DEFAULT_ERRORS = {
    invalidParams: "Invalid path parameters",
    invalidQuery: "Invalid query parameters",
    invalidBody: "Invalid request payload",
} as const

function getClientIp(req: Request): string {
    const forwarded = req.headers.get("x-forwarded-for")
    if (forwarded) {
        const firstIp = forwarded.split(",")[0]?.trim()
        if (firstIp) return firstIp
    }
    return req.headers.get("x-real-ip") || "anonymous"
}

function getQueryObject(url: string): Record<string, string> {
    const { searchParams } = new URL(url)
    const query: Record<string, string> = {}
    for (const [key, value] of searchParams.entries()) {
        query[key] = value
    }
    return query
}

async function resolveParams<TContext>(context: TContext): Promise<Record<string, unknown>> {
    const maybeParams = (context as { params?: unknown } | undefined)?.params
    if (!maybeParams) return {}
    if (typeof (maybeParams as Promise<unknown>).then === "function") {
        const awaited = await (maybeParams as Promise<unknown>)
        return (awaited as Record<string, unknown>) || {}
    }
    return (maybeParams as Record<string, unknown>) || {}
}

export function withApiGuard<
    TContext extends NextRouteContext = NextRouteContext,
    TParams extends Record<string, unknown> = Record<string, unknown>,
    TQuery extends Record<string, unknown> = Record<string, unknown>,
    TBody = unknown,
>(
    options: WithApiGuardOptions<TContext, TParams, TQuery, TBody>,
    handler: (args: GuardHandlerArgs<TContext, TParams, TQuery, TBody>) => Promise<Response> | Response
) {
    return async (req: Request, context: TContext): Promise<Response> => {
        const ip = getClientIp(req)
        const mergedErrors = { ...DEFAULT_ERRORS, ...(options.errors || {}) }

        let auth: ApiAuthResult | null = null
        let roles: AppRole[] = []

        if (options.auth.mode === "user") {
            const authCheck = await requireApiUser({ roles: options.auth.roles || [] })
            if ("error" in authCheck) return authCheck.error
            auth = authCheck.auth
            roles = authCheck.roles
        } else if (options.auth.mode === "webhook") {
            const verifyResult = await options.auth.verify({ req, context, ip })
            if (verifyResult) return verifyResult
        }

        let params = await resolveParams(context)
        if (options.validation?.params) {
            const parsedParams = options.validation.params.safeParse(params)
            if (!parsedParams.success) {
                return createApiError("VALIDATION_ERROR", mergedErrors.invalidParams, 400, parsedParams.error.issues)
            }
            params = parsedParams.data as Record<string, unknown>
        }

        let query = getQueryObject(req.url)
        if (options.validation?.query) {
            const parsedQuery = options.validation.query.safeParse(query)
            if (!parsedQuery.success) {
                return createApiError("VALIDATION_ERROR", mergedErrors.invalidQuery, 400, parsedQuery.error.issues)
            }
            query = parsedQuery.data as Record<string, string>
        }

        let body: TBody | undefined
        if (options.validation?.body) {
            let rawBody: unknown
            try {
                rawBody = await req.json()
            } catch {
                return createApiError("VALIDATION_ERROR", mergedErrors.invalidBody, 400)
            }

            const parsedBody = options.validation.body.safeParse(rawBody)
            if (!parsedBody.success) {
                return createApiError("VALIDATION_ERROR", mergedErrors.invalidBody, 400, parsedBody.error.issues)
            }
            body = parsedBody.data
        }

        if (options.rateLimit) {
            const key = options.rateLimit.key({
                req,
                context,
                ip,
                auth,
                roles,
                params: params as TParams,
                query: query as TQuery,
                body,
            })
            const limitCheck = await rateLimit(key, options.rateLimit.limit, options.rateLimit.windowMs)
            if (!limitCheck.success) {
                return limitCheck.error || createApiError("TOO_MANY_REQUESTS", "Rate limit exceeded", 429)
            }
        }

        return handler({
            req,
            context,
            ip,
            auth,
            roles,
            params: params as TParams,
            query: query as TQuery,
            body,
        })
    }
}
