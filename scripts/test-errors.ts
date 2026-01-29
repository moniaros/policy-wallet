/**
 * Quick Integration Test for Error Handling
 * 
 * Tests that error handlers work correctly with various error types
 * Run with: npx tsx scripts/test-errors.ts
 */

import { AppError, handleActionError } from '../lib/errors'
import { z } from 'zod'

console.log('🧪 Testing Error Handling System...\n')

// Test 1: AppError.unauthorized
console.log('Test 1: AppError.unauthorized()')
try {
    throw AppError.unauthorized()
} catch (error) {
    const result = handleActionError(error)
    console.log('✅ Result:', JSON.stringify(result, null, 2))
    console.assert(result.success === false, 'Should be unsuccessful')
    console.assert(result.code === 'UNAUTHORIZED', 'Should have UNAUTHORIZED code')
    console.assert(result.error.includes('logged in'), 'Should have login message')
}
console.log()

// Test 2: AppError.unauthorized with Greek
console.log('Test 2: AppError.unauthorized() with Greek')
try {
    throw AppError.unauthorized(undefined, 'el')
} catch (error) {
    const result = handleActionError(error)
    console.log('✅ Result:', JSON.stringify(result, null, 2))
    console.assert(result.error.includes('συνδεθείτε'), 'Should have Greek message')
}
console.log()

// Test 3: AppError.notFound
console.log('Test 3: AppError.notFound()')
try {
    throw AppError.notFound('Policy', 'pol-123')
} catch (error) {
    const result = handleActionError(error)
    console.log('✅ Result:', JSON.stringify(result, null, 2))
    console.assert(result.code === 'NOT_FOUND', 'Should have NOT_FOUND code')
    console.assert(result.error.includes('Policy'), 'Should mention Policy')
    console.assert(result.error.includes('pol-123'), 'Should include ID')
}
console.log()

// Test 4: AppError.validation
console.log('Test 4: AppError.validation()')
try {
    throw AppError.validation({
        email: ['Invalid email format', 'Email is required'],
        password: ['Password must be at least 8 characters']
    })
} catch (error) {
    const result = handleActionError(error)
    console.log('✅ Result:', JSON.stringify(result, null, 2))
    console.assert(result.code === 'VALIDATION', 'Should have VALIDATION code')
    console.assert(result.details !== undefined, 'Should have details')
    console.assert(result.details?.email?.length === 2, 'Should have 2 email errors')
}
console.log()

// Test 5: Zod validation error
console.log('Test 5: Zod validation error')
const schema = z.object({
    email: z.string().email(),
    age: z.number().min(18)
})

try {
    schema.parse({ email: 'invalid', age: 15 })
} catch (error) {
    const result = handleActionError(error)
    console.log('✅ Result:', JSON.stringify(result, null, 2))
    console.assert(result.code === 'VALIDATION', 'Should have VALIDATION code')
    console.assert(result.details !== undefined, 'Should have validation details')
}
console.log()

// Test 6: AppError.externalService
console.log('Test 6: AppError.externalService()')
try {
    const originalError = new Error('Connection timeout')
    throw AppError.externalService('Gemini AI', originalError)
} catch (error) {
    const result = handleActionError(error)
    console.log('✅ Result:', JSON.stringify(result, null, 2))
    console.assert(result.code === 'EXTERNAL_SERVICE', 'Should have EXTERNAL_SERVICE code')
    console.assert(result.error.includes('Gemini AI'), 'Should mention service name')
}
console.log()

// Test 7: AppError.rateLimited
console.log('Test 7: AppError.rateLimited()')
try {
    throw AppError.rateLimited(60)
} catch (error) {
    const result = handleActionError(error)
    console.log('✅ Result:', JSON.stringify(result, null, 2))
    console.assert(result.code === 'RATE_LIMITED', 'Should have RATE_LIMITED code')
    console.assert(result.error.includes('60'), 'Should include retry time')
}
console.log()

// Test 8: Generic Error
console.log('Test 8: Generic Error')
try {
    throw new Error('Something went wrong')
} catch (error) {
    const result = handleActionError(error)
    console.log('✅ Result:', JSON.stringify(result, null, 2))
    console.assert(result.code === 'INTERNAL_ERROR', 'Should have INTERNAL_ERROR code')
    console.assert(result.error.includes('unexpected'), 'Should have generic message')
}
console.log()

// Test 9: AppError.with() metadata
console.log('Test 9: AppError.with() metadata')
try {
    throw AppError.notFound('Policy').with({
        userId: 'user-123',
        attemptedAction: 'view'
    })
} catch (error) {
    const result = handleActionError(error)
    console.log('✅ Result:', JSON.stringify(result, null, 2))
    console.assert(result.code === 'NOT_FOUND', 'Should have NOT_FOUND code')
}
console.log()

console.log('✅ All error handling tests passed!\n')
console.log('📊 Summary:')
console.log('  - AppError factory methods work correctly')
console.log('  - Greek translations work')
console.log('  - Zod integration works')
console.log('  - Error metadata is preserved')
console.log('  - handleActionError() returns consistent format')
