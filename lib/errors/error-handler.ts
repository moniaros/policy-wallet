/**
 * Error Handler Utilities
 * 
 * Provides consistent error handling for server actions and API routes
 */

import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { Prisma } from '@prisma/client'
import { AppError, type ErrorCode, type ValidationErrors } from './app-error'
import { logger } from '@/lib/logger'
import * as Sentry from '@sentry/nextjs'

/**
 * Result types for server actions
 */
export type ActionErrorResult = {
    success: false
    error: string
    code: ErrorCode
    details?: ValidationErrors
}

export type ActionSuccessResult<T = void> = {
    success: true
    data?: T
}

export type ActionResult<T = void> = ActionSuccessResult<T> | ActionErrorResult

/**
 * Handle errors in server actions
 * Converts various error types to a consistent ActionErrorResult
 */
export function handleActionError(error: unknown): ActionErrorResult {
    // AppError - structured application errors
    if (error instanceof AppError) {
        logger('warn', 'Application error in action', {
            code: error.code,
            message: error.message,
            metadata: error.metadata
        })

        return {
            success: false,
            error: error.userMessage,
            code: error.code,
            ...(error.metadata.errors ? { details: error.metadata.errors as ValidationErrors } : {})
        }
    }

    // Zod validation errors
    if (error instanceof ZodError) {
        const validationErrors: ValidationErrors = {}

        error.issues.forEach((err) => {
            const path = err.path.join('.')
            if (!validationErrors[path]) {
                validationErrors[path] = []
            }
            validationErrors[path].push(err.message)
        })

        logger('warn', 'Validation error in action', { errors: validationErrors })

        return {
            success: false,
            error: 'Validation failed',
            code: 'VALIDATION',
            details: validationErrors
        }
    }

    // Prisma errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        return handlePrismaError(error)
    }

    // Generic errors
    if (error instanceof Error) {
        logger('error', 'Unexpected error in action', {
            message: error.message,
            stack: error.stack
        })

        // Capture to Sentry
        Sentry.captureException(error)

        return {
            success: false,
            error: 'An unexpected error occurred. Please try again.',
            code: 'INTERNAL_ERROR'
        }
    }

    // Unknown error type
    logger('error', 'Unknown error type in action', { error })
    Sentry.captureException(error)

    return {
        success: false,
        error: 'An unexpected error occurred. Please try again.',
        code: 'INTERNAL_ERROR'
    }
}

/**
 * Handle Prisma-specific errors
 */
function handlePrismaError(error: Prisma.PrismaClientKnownRequestError): ActionErrorResult {
    switch (error.code) {
        case 'P2002': {
            // Unique constraint violation
            const field = (error.meta?.target as string[])?.[0] || 'field'
            logger('warn', 'Unique constraint violation', { field, code: error.code })

            return {
                success: false,
                error: `A record with this ${field} already exists`,
                code: 'CONFLICT'
            }
        }

        case 'P2025': {
            // Record not found
            logger('warn', 'Record not found', { code: error.code })

            return {
                success: false,
                error: 'The requested record was not found',
                code: 'NOT_FOUND'
            }
        }

        case 'P2003': {
            // Foreign key constraint violation
            logger('warn', 'Foreign key constraint violation', { code: error.code })

            return {
                success: false,
                error: 'This operation would violate data integrity',
                code: 'CONFLICT'
            }
        }

        default: {
            // Other Prisma errors
            logger('error', 'Prisma error', {
                code: error.code,
                message: error.message,
                meta: error.meta
            })

            Sentry.captureException(error)

            return {
                success: false,
                error: 'A database error occurred. Please try again.',
                code: 'INTERNAL_ERROR'
            }
        }
    }
}

/**
 * Handle errors in API routes
 * Returns a NextResponse with appropriate status code and error details
 */
export function handleApiError(error: unknown): NextResponse {
    const errorId = generateErrorId()

    // AppError - structured application errors
    if (error instanceof AppError) {
        logger('warn', 'Application error in API', {
            errorId,
            code: error.code,
            message: error.message,
            metadata: error.metadata
        })

        return NextResponse.json(
            {
                success: false,
                error: error.toJSON()
            },
            {
                status: error.statusCode,
                headers: { 'X-Error-Id': errorId }
            }
        )
    }

    // Zod validation errors
    if (error instanceof ZodError) {
        const validationErrors: ValidationErrors = {}

        error.issues.forEach((err) => {
            const path = err.path.join('.')
            if (!validationErrors[path]) {
                validationErrors[path] = []
            }
            validationErrors[path].push(err.message)
        })

        logger('warn', 'Validation error in API', { errorId, errors: validationErrors })

        return NextResponse.json(
            {
                success: false,
                error: {
                    code: 'VALIDATION',
                    message: 'Validation failed',
                    details: validationErrors
                }
            },
            {
                status: 400,
                headers: { 'X-Error-Id': errorId }
            }
        )
    }

    // Prisma errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        const actionError = handlePrismaError(error)
        const statusCode = actionError.code === 'NOT_FOUND' ? 404 :
            actionError.code === 'CONFLICT' ? 409 : 500

        return NextResponse.json(
            {
                success: false,
                error: {
                    code: actionError.code,
                    message: actionError.error
                }
            },
            {
                status: statusCode,
                headers: { 'X-Error-Id': errorId }
            }
        )
    }

    // Generic errors
    if (error instanceof Error) {
        logger('error', 'Unexpected error in API', {
            errorId,
            message: error.message,
            stack: error.stack
        })

        Sentry.captureException(error, { tags: { errorId } })

        return NextResponse.json(
            {
                success: false,
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'An unexpected error occurred. Please try again.'
                }
            },
            {
                status: 500,
                headers: { 'X-Error-Id': errorId }
            }
        )
    }

    // Unknown error type
    logger('error', 'Unknown error type in API', { errorId, error })
    Sentry.captureException(error, { tags: { errorId } })

    return NextResponse.json(
        {
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'An unexpected error occurred. Please try again.'
            }
        },
        {
            status: 500,
            headers: { 'X-Error-Id': errorId }
        }
    )
}

/**
 * Generate a unique error ID for tracking
 */
function generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}
