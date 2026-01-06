import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
const prisma = new PrismaClient()

async function main() {
    console.log('Start seeding...')

    // 0. Lookup Tables
    await prisma.insurer.upsert({
        where: { name: 'Interamerican' },
        update: {},
        create: { name: 'Interamerican' }
    })
    await prisma.insurer.upsert({
        where: { name: 'Generali' },
        update: {},
        create: { name: 'Generali' }
    })
    await prisma.insurer.upsert({
        where: { name: 'Allianz' },
        update: {},
        create: { name: 'Allianz' }
    })
    await prisma.insurer.upsert({
        where: { name: 'AXA' },
        update: {},
        create: { name: 'AXA' }
    })
    await prisma.insurer.upsert({
        where: { name: 'Ergo' },
        update: {},
        create: { name: 'Ergo' }
    })

    const types = [
        { name: 'Motor (Αυτοκίνητο)', slug: 'motor' },
        { name: 'Health (Υγεία)', slug: 'health' },
        { name: 'Home (Κατοικία)', slug: 'home' },
        { name: 'Life (Ζωή)', slug: 'life' },
        { name: 'Travel (Ταξιδιωτική)', slug: 'travel' },
        { name: 'Liability (Αστική Ευθύνη)', slug: 'liability' },
    ]

    for (const type of types) {
        await prisma.insuranceType.upsert({
            where: { slug: type.slug },
            update: { name: type.name },
            create: type
        })
    }

    // 1. Create Users

    const hashedPassword = await bcrypt.hash('password123', 10)

    // Policyholder 1
    const ph1 = await prisma.user.upsert({
        where: { email: 'ph1@example.com' },
        update: {
            roles: 'policyholder,admin',
            password: hashedPassword
        },
        create: {
            email: 'ph1@example.com',
            name: 'Maria Papadopoulou',
            roles: 'policyholder,admin',
            password: hashedPassword,
            preferredLanguage: 'el',
            policyholderProfile: {
                create: {}
            }
        },
    })

    // Agent 1
    const ag1 = await prisma.user.upsert({
        where: { email: 'agent1@example.com' },
        update: { password: hashedPassword },
        create: {
            email: 'agent1@example.com',
            name: 'Nikos Insurance',
            roles: 'agent',
            password: hashedPassword,
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
        update: { password: hashedPassword },
        create: {
            email: 'mixed@example.com',
            name: 'Giorgos Dual',
            roles: 'policyholder,agent',
            password: hashedPassword,
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

    // Gap Definitions are handled in section 5

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


    // 5. Plans & Subscriptions
    console.log('Seeding plans...')

    const plans = [
        // Policyholder Plans
        {
            id: 'ph-free',
            planType: 'policyholder',
            name: 'Free',
            displayName: 'PolicyWallet Essential',
            price: 0,
            billingPeriod: 'monthly',
            entitlements: {
                policy_storage: 'unlimited',
                ai_analyses_per_month: 2,
                notifications: 'basic',
                priority_processing: false
            }
        },
        {
            id: 'ph-plus',
            planType: 'policyholder',
            name: 'Plus',
            displayName: 'PolicyWallet Plus',
            price: 9.99,
            billingPeriod: 'monthly',
            entitlements: {
                policy_storage: 'unlimited',
                ai_analyses_per_month: 10,
                notifications: 'advanced',
                priority_processing: true,
                full_history: true
            }
        },
        {
            id: 'ph-premium',
            planType: 'policyholder',
            name: 'Premium',
            displayName: 'PolicyWallet Premium',
            price: 24.99,
            billingPeriod: 'monthly',
            entitlements: {
                policy_storage: 'unlimited',
                ai_analyses_per_month: 'unlimited',
                notifications: 'advanced',
                priority_processing: true,
                full_history: true,
                priority_support: true
            }
        },
        // Agent Plans
        {
            id: 'ag-free',
            planType: 'agent',
            name: 'Free',
            displayName: 'Agency Free',
            price: 0,
            billingPeriod: 'monthly',
            entitlements: {
                customer_limit: 5,
                ai_analyses_per_month: 5,
                crm_features: 'basic'
            }
        },
        {
            id: 'ag-starter',
            planType: 'agent',
            name: 'Starter',
            displayName: 'Agency Starter',
            price: 49.00,
            billingPeriod: 'monthly',
            entitlements: {
                customer_limit: 50,
                ai_analyses_per_month: 100,
                crm_features: 'advanced',
                opportunity_tracking: true
            }
        },
        {
            id: 'ag-pro',
            planType: 'agent',
            name: 'Pro',
            displayName: 'Agency Pro',
            price: 199.00,
            billingPeriod: 'monthly',
            entitlements: {
                customer_limit: 500,
                ai_analyses_per_month: 1000,
                crm_features: 'advanced',
                opportunity_tracking: true,
                analytics: true
            }
        }
    ]

    for (const plan of plans) {
        await prisma.plan.upsert({
            where: { id: plan.id },
            update: plan,
            create: plan as any
        })
    }

    // Assign subscriptions to seeded users
    await prisma.subscription.create({
        data: {
            userId: ph1.id,
            planId: 'ph-free',
            status: 'active',
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            autoRenew: true
        }
    })

    await prisma.subscription.create({
        data: {
            userId: ag1.id,
            planId: 'ag-starter',
            status: 'active',
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            autoRenew: true
        }
    })

    // Add some Credit Transactions
    await prisma.creditTransaction.create({
        data: {
            userId: ph1.id,
            amount: 15,
            transactionType: 'earn',
            balanceAfter: 15,
            description: 'Referral bonus'
        }
    })

    // Add an Invoice
    await prisma.invoice.create({
        data: {
            userId: ag1.id,
            subscriptionId: (await prisma.subscription.findFirst({ where: { userId: ag1.id } }))!.id,
            invoiceNumber: 'INV-2024-001',
            amount: 49.00,
            taxAmount: 0,
            totalAmount: 49.00,
            status: 'paid',
            billingDate: new Date()
        }
    })

    // Add Active Sessions
    await prisma.activeSession.create({
        data: {
            userId: ph1.id,
            deviceName: 'MacBook Pro',
            deviceType: 'desktop',
            ipAddress: '192.168.1.1',
            location: 'Athens, Greece'
        }
    })

    // 6. Questionnaire Templates
    await prisma.questionnaireTemplate.upsert({
        where: { id: 'motor-risk-v1' },
        update: {},
        create: {
            id: 'motor-risk-v1',
            name: 'Motor Risk Assessment',
            lineOfBusiness: 'motor',
            version: 1,
            questions: [
                {
                    id: 'business_use',
                    type: 'boolean',
                    label: 'Do you use the vehicle for business or commercial delivery?',
                    required: true
                },
                {
                    id: 'additional_drivers',
                    type: 'text',
                    label: 'Are there any other regular drivers of this vehicle?',
                    required: false
                },
                {
                    id: 'private_garage',
                    type: 'boolean',
                    label: 'Is the vehicle parked in a private locked garage at night?',
                    required: true
                }
            ],
            isActive: true
        }
    })

    await prisma.questionnaireTemplate.upsert({
        where: { id: 'health-lifestyle-v1' },
        update: {},
        create: {
            id: 'health-lifestyle-v1',
            name: 'Health & Lifestyle Assessment',
            lineOfBusiness: 'health',
            version: 1,
            questions: [
                {
                    id: 'dangerous_sports',
                    type: 'boolean',
                    label: 'Do you participate in any high-risk sports (e.g., skydiving, racing)?',
                    required: true
                },
                {
                    id: 'smoking_status',
                    type: 'select',
                    label: 'Smoking Status',
                    options: ['Non-smoker', 'Occasional', 'Regular'],
                    required: true
                },
                {
                    id: 'dependants_count',
                    type: 'number',
                    label: 'How many dependants would you like to cover?',
                    required: true
                }
            ],
            isActive: true
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
