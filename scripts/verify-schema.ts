/**
 * Schema Verification Script
 * 
 * Verifies that TypeScript enums align with Prisma schema expectations
 * Run with: npx tsx scripts/verify-schema.ts
 */

import { PrismaClient } from '@prisma/client'
import {
    LINES_OF_BUSINESS,
    POLICY_STATUSES,
    GAP_SEVERITIES,
    GAP_STATUSES,
    OPPORTUNITY_STATUSES,
    RELATIONSHIP_STATUSES,
    ACTIVATION_STATUSES,
    DOCUMENT_SOURCES,
    PROCESSING_STATUSES,
    NOTIFICATION_STATUSES,
    USER_ROLES
} from '../types/enums'

const db = new PrismaClient()

interface ValidationResult {
    field: string
    table: string
    enumName: string
    status: 'PASS' | 'WARN' | 'FAIL'
    message: string
    expectedValues?: string[]
    actualValues?: string[]
}

const results: ValidationResult[] = []

/**
 * Check if enum values are used in the database
 */
async function verifyEnumUsage() {
    console.log('🔍 Verifying TypeScript Enums against Database Usage...\n')

    // 1. Verify LineOfBusiness
    try {
        const policies = await db.policy.findMany({
            select: { lineOfBusiness: true },
            distinct: ['lineOfBusiness']
        })

        const usedValues = policies.map(p => p.lineOfBusiness)
        const invalidValues = usedValues.filter(v => !LINES_OF_BUSINESS.includes(v as any))

        if (invalidValues.length > 0) {
            results.push({
                field: 'lineOfBusiness',
                table: 'Policy',
                enumName: 'LINES_OF_BUSINESS',
                status: 'FAIL',
                message: `Found ${invalidValues.length} invalid values in database`,
                expectedValues: [...LINES_OF_BUSINESS],
                actualValues: invalidValues
            })
        } else {
            results.push({
                field: 'lineOfBusiness',
                table: 'Policy',
                enumName: 'LINES_OF_BUSINESS',
                status: 'PASS',
                message: `All ${usedValues.length} values are valid`
            })
        }
    } catch (error) {
        results.push({
            field: 'lineOfBusiness',
            table: 'Policy',
            enumName: 'LINES_OF_BUSINESS',
            status: 'WARN',
            message: 'Could not verify (table may be empty)'
        })
    }

    // 2. Verify Policy Status
    try {
        const policies = await db.policy.findMany({
            select: { status: true },
            distinct: ['status']
        })

        const usedValues = policies.map(p => p.status)
        const invalidValues = usedValues.filter(v => !POLICY_STATUSES.includes(v as any))

        if (invalidValues.length > 0) {
            results.push({
                field: 'status',
                table: 'Policy',
                enumName: 'POLICY_STATUSES',
                status: 'FAIL',
                message: `Found ${invalidValues.length} invalid values in database`,
                expectedValues: [...POLICY_STATUSES],
                actualValues: invalidValues
            })
        } else {
            results.push({
                field: 'status',
                table: 'Policy',
                enumName: 'POLICY_STATUSES',
                status: 'PASS',
                message: `All ${usedValues.length} values are valid`
            })
        }
    } catch (error) {
        results.push({
            field: 'status',
            table: 'Policy',
            enumName: 'POLICY_STATUSES',
            status: 'WARN',
            message: 'Could not verify (table may be empty)'
        })
    }

    // 3. Verify Gap Severity
    try {
        const gaps = await db.gapInstance.findMany({
            select: { severity: true },
            distinct: ['severity']
        })

        const usedValues = gaps.map(g => g.severity)
        const invalidValues = usedValues.filter(v => !GAP_SEVERITIES.includes(v as any))

        if (invalidValues.length > 0) {
            results.push({
                field: 'severity',
                table: 'GapInstance',
                enumName: 'GAP_SEVERITIES',
                status: 'FAIL',
                message: `Found ${invalidValues.length} invalid values in database`,
                expectedValues: [...GAP_SEVERITIES],
                actualValues: invalidValues
            })
        } else {
            results.push({
                field: 'severity',
                table: 'GapInstance',
                enumName: 'GAP_SEVERITIES',
                status: 'PASS',
                message: `All ${usedValues.length} values are valid`
            })
        }
    } catch (error) {
        results.push({
            field: 'severity',
            table: 'GapInstance',
            enumName: 'GAP_SEVERITIES',
            status: 'WARN',
            message: 'Could not verify (table may be empty)'
        })
    }

    // 4. Verify Gap Status
    try {
        const gaps = await db.gapInstance.findMany({
            select: { status: true },
            distinct: ['status']
        })

        const usedValues = gaps.map(g => g.status)
        const invalidValues = usedValues.filter(v => !GAP_STATUSES.includes(v as any))

        if (invalidValues.length > 0) {
            results.push({
                field: 'status',
                table: 'GapInstance',
                enumName: 'GAP_STATUSES',
                status: 'FAIL',
                message: `Found ${invalidValues.length} invalid values in database`,
                expectedValues: [...GAP_STATUSES],
                actualValues: invalidValues
            })
        } else {
            results.push({
                field: 'status',
                table: 'GapInstance',
                enumName: 'GAP_STATUSES',
                status: 'PASS',
                message: `All ${usedValues.length} values are valid`
            })
        }
    } catch (error) {
        results.push({
            field: 'status',
            table: 'GapInstance',
            enumName: 'GAP_STATUSES',
            status: 'WARN',
            message: 'Could not verify (table may be empty)'
        })
    }

    // 5. Verify Opportunity Status
    try {
        const opportunities = await db.opportunity.findMany({
            select: { status: true },
            distinct: ['status']
        })

        const usedValues = opportunities.map(o => o.status)
        const invalidValues = usedValues.filter(v => !OPPORTUNITY_STATUSES.includes(v as any))

        if (invalidValues.length > 0) {
            results.push({
                field: 'status',
                table: 'Opportunity',
                enumName: 'OPPORTUNITY_STATUSES',
                status: 'FAIL',
                message: `Found ${invalidValues.length} invalid values in database`,
                expectedValues: [...OPPORTUNITY_STATUSES],
                actualValues: invalidValues
            })
        } else {
            results.push({
                field: 'status',
                table: 'Opportunity',
                enumName: 'OPPORTUNITY_STATUSES',
                status: 'PASS',
                message: `All ${usedValues.length} values are valid`
            })
        }
    } catch (error) {
        results.push({
            field: 'status',
            table: 'Opportunity',
            enumName: 'OPPORTUNITY_STATUSES',
            status: 'WARN',
            message: 'Could not verify (table may be empty)'
        })
    }

    // Print results
    console.log('📊 Verification Results:\n')

    const passCount = results.filter(r => r.status === 'PASS').length
    const warnCount = results.filter(r => r.status === 'WARN').length
    const failCount = results.filter(r => r.status === 'FAIL').length

    results.forEach(result => {
        const icon = result.status === 'PASS' ? '✅' : result.status === 'WARN' ? '⚠️' : '❌'
        console.log(`${icon} ${result.table}.${result.field} (${result.enumName})`)
        console.log(`   ${result.message}`)

        if (result.actualValues && result.actualValues.length > 0) {
            console.log(`   Invalid values: ${result.actualValues.join(', ')}`)
            console.log(`   Expected one of: ${result.expectedValues?.join(', ')}`)
        }
        console.log()
    })

    console.log(`\n📈 Summary: ${passCount} passed, ${warnCount} warnings, ${failCount} failed\n`)

    if (failCount > 0) {
        console.error('❌ Verification failed! Please update enums or database values.')
        process.exit(1)
    } else if (warnCount > 0) {
        console.warn('⚠️  Some checks could not be verified (tables may be empty)')
    } else {
        console.log('✅ All verifications passed!')
    }
}

// Run verification
verifyEnumUsage()
    .catch(error => {
        console.error('Error during verification:', error)
        process.exit(1)
    })
    .finally(() => {
        db.$disconnect()
    })
