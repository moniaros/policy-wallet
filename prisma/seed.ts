import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    console.log('Start seeding...')

    // 1. Create Users

    // Policyholder 1
    const ph1 = await prisma.user.upsert({
        where: { email: 'ph1@example.com' },
        update: {},
        create: {
            email: 'ph1@example.com',
            name: 'Maria Papadopoulou',
            roles: 'policyholder',
            preferredLanguage: 'el',
            policyholderProfile: {
                create: {}
            }
        },
    })

    // Agent 1
    const ag1 = await prisma.user.upsert({
        where: { email: 'agent1@example.com' },
        update: {},
        create: {
            email: 'agent1@example.com',
            name: 'Nikos Insurance',
            roles: 'agent',
            preferredLanguage: 'el',
            agentProfile: {
                create: {
                    verificationStatus: 'verified',
                    agencyName: 'Nikos Agency',
                    licenseNumber: '123456'
                }
            }
        },
    })

    // Mixed Role
    const mixed1 = await prisma.user.upsert({
        where: { email: 'mixed@example.com' },
        update: {},
        create: {
            email: 'mixed@example.com',
            name: 'Giorgos Dual',
            roles: 'policyholder,agent',
            preferredLanguage: 'el',
            agentProfile: {
                create: {
                    verificationStatus: 'pending',
                    agencyName: 'Giorgos Agency'
                }
            }
        },
    })

    // 2. Create Policies for PH1

    await prisma.policy.create({
        data: {
            ownerUserId: ph1.id,
            createdByUserId: ph1.id, // self-uploaded
            insurerName: 'Interamerican',
            policyNumber: 'INT-100200',
            lineOfBusiness: 'motor',
            startDate: new Date('2024-01-01'),
            endDate: new Date('2025-01-01'), // Expiring soon relative to 2026? No, already expired in 2026.
            // Wait, User Time is 2026-01-05.
            // Make validation relevant to 2026.
            // Set to expire Feb 2026.
            // Start: Feb 2025. End: Feb 2026.
            status: 'expiring_soon',
            premiumAmount: 150.00,
        }
    })

    await prisma.policy.create({
        data: {
            ownerUserId: ph1.id,
            createdByUserId: ph1.id,
            insurerName: 'Generali',
            policyNumber: 'GEN-Health-55',
            lineOfBusiness: 'health',
            startDate: new Date('2025-06-01'),
            endDate: new Date('2026-06-01'),
            status: 'active',
            premiumAmount: 450.00,
        }
    })

    // 3. Create Gap Definitions
    await prisma.gapDefinition.create({
        data: {
            name: 'Underinsured Motor Value',
            description: 'Your vehicle value may have depreciated, check if insured value matches.',
            lineOfBusiness: 'motor',
            defaultSeverity: 'medium',
            ruleId: 'MOTOR_VALUE_CHECK'
        }
    })

    // 4. Create Notification Event
    await prisma.notificationEvent.create({
        data: {
            userId: ph1.id,
            eventType: 'policy_expiry',
            channel: 'email',
            title: 'Your car insurance expires soon',
            message: 'Renew now to avoid gaps.',
            status: 'sent'
        }
    })

    console.log('Seeding finished.')
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
