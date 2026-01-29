/**
 * Application Error Classes
 * 
 * Provides structured error handling with user-friendly messages,
 * error codes, and metadata for debugging.
 */

export type ErrorCode =
    | 'UNAUTHORIZED'
    | 'FORBIDDEN'
    | 'NOT_FOUND'
    | 'VALIDATION'
    | 'CONFLICT'
    | 'RATE_LIMITED'
    | 'EXTERNAL_SERVICE'
    | 'INTERNAL_ERROR'

export type ValidationErrors = Record<string, string[]>

export interface AppErrorOptions {
    code: ErrorCode
    message: string
    statusCode: number
    userMessage?: string
    metadata?: Record<string, unknown>
}

/**
 * Base application error class with structured error information
 */
export class AppError extends Error {
    public readonly code: ErrorCode
    public readonly statusCode: number
    public readonly userMessage: string
    public readonly metadata: Record<string, unknown>

    constructor(options: AppErrorOptions) {
        super(options.message)
        this.name = 'AppError'
        this.code = options.code
        this.statusCode = options.statusCode
        this.userMessage = options.userMessage || options.message
        this.metadata = options.metadata || {}

        // Maintains proper stack trace for where error was thrown
        Error.captureStackTrace(this, this.constructor)
    }

    /**
     * Add additional metadata to the error
     */
    with(metadata: Record<string, unknown>): this {
        Object.assign(this.metadata, metadata)
        return this
    }

    /**
     * Convert error to JSON for API responses
     */
    toJSON() {
        return {
            code: this.code,
            message: this.userMessage,
            ...(Object.keys(this.metadata).length > 0 && { details: this.metadata })
        }
    }

    // Static factory methods for common errors

    static unauthorized(message?: string, language: 'en' | 'el' = 'en'): AppError {
        const defaultMessage = language === 'el'
            ? 'Πρέπει να συνδεθείτε για να εκτελέσετε αυτήν την ενέργεια'
            : 'You must be logged in to perform this action'

        return new AppError({
            code: 'UNAUTHORIZED',
            message: message || defaultMessage,
            statusCode: 401,
            userMessage: message || defaultMessage
        })
    }

    static forbidden(message?: string, language: 'en' | 'el' = 'en'): AppError {
        const defaultMessage = language === 'el'
            ? 'Δεν έχετε δικαίωμα να εκτελέσετε αυτήν την ενέργεια'
            : 'You do not have permission to perform this action'

        return new AppError({
            code: 'FORBIDDEN',
            message: message || defaultMessage,
            statusCode: 403,
            userMessage: message || defaultMessage
        })
    }

    static notFound(resource: string, id?: string): AppError {
        const message = id
            ? `${resource} with ID "${id}" not found`
            : `${resource} not found`

        return new AppError({
            code: 'NOT_FOUND',
            message,
            statusCode: 404,
            userMessage: message,
            metadata: { resource, id }
        })
    }

    static validation(errors: ValidationErrors, message = 'Validation failed'): AppError {
        return new AppError({
            code: 'VALIDATION',
            message,
            statusCode: 400,
            userMessage: message,
            metadata: { errors }
        })
    }

    static conflict(message: string, metadata?: Record<string, unknown>): AppError {
        return new AppError({
            code: 'CONFLICT',
            message,
            statusCode: 409,
            userMessage: message,
            metadata
        })
    }

    static rateLimited(retryAfter?: number): AppError {
        const message = retryAfter
            ? `Too many requests. Please try again in ${retryAfter} seconds.`
            : 'Too many requests. Please try again later.'

        return new AppError({
            code: 'RATE_LIMITED',
            message,
            statusCode: 429,
            userMessage: message,
            metadata: { retryAfter }
        })
    }

    static externalService(service: string, originalError: Error): AppError {
        return new AppError({
            code: 'EXTERNAL_SERVICE',
            message: `External service error: ${service}`,
            statusCode: 502,
            userMessage: `The ${service} service is currently unavailable. Please try again later.`,
            metadata: {
                service,
                originalError: originalError.message
            }
        })
    }

    static internal(message = 'An unexpected error occurred', metadata?: Record<string, unknown>): AppError {
        return new AppError({
            code: 'INTERNAL_ERROR',
            message,
            statusCode: 500,
            userMessage: 'An unexpected error occurred. Our team has been notified.',
            metadata
        })
    }
}
