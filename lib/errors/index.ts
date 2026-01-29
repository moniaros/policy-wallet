/**
 * Error Handling Module
 * 
 * Centralized error handling for the application
 */

export { AppError } from './app-error'
export type { ErrorCode, ValidationErrors } from './app-error'

export { handleActionError, handleApiError } from './error-handler'
export type { ActionResult, ActionSuccessResult, ActionErrorResult } from './error-handler'
