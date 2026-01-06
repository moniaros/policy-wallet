const { PrismaClient } = require('@prisma/client')
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
    const ph1 = await prisma.user.upsert({
        where: { email: 'ph1@example.com' },
        update: { roles: 'policyholder,admin' },
        create: {
            email: 'ph1@example.com',
            name: 'Maria Papadopoulou',
            roles: 'policyholder,admin',
            preferredLanguage: 'el',
            policyholderProfile: { create: {} }
        },
    })

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

    // 2. Plans
    console.log('Seeding plans...')
    const plans = [
        { id: 'ph-free', planType: 'policyholder', name: 'Free', displayName: 'PolicyWallet Essential', price: 0, billingPeriod: 'monthly', entitlements: { policy_storage: 'unlimited', ai_analyses_per_month: 2, notifications: 'basic', priority_processing: false } },
        { id: 'ph-plus', planType: 'policyholder', name: 'Plus', displayName: 'PolicyWallet Plus', price: 9.99, billingPeriod: 'monthly', entitlements: { policy_storage: 'unlimited', ai_analyses_per_month: 10, notifications: 'advanced', priority_processing: true, full_history: true } },
        { id: 'ph-premium', planType: 'policyholder', name: 'Premium', displayName: 'PolicyWallet Premium', price: 24.99, billingPeriod: 'monthly', entitlements: { policy_storage: 'unlimited', ai_analyses_per_month: 'unlimited', notifications: 'advanced', priority_processing: true, full_history: true, priority_support: true } },
        { id: 'ag-free', planType: 'agent', name: 'Free', displayName: 'Agency Free', price: 0, billingPeriod: 'monthly', entitlements: { customer_limit: 5, ai_analyses_per_month: 5, crm_features: 'basic' } },
        { id: 'ag-starter', planType: 'agent', name: 'Starter', displayName: 'Agency Starter', price: 49.00, billingPeriod: 'monthly', entitlements: { customer_limit: 50, ai_analyses_per_month: 100, crm_features: 'advanced', opportunity_tracking: true } },
        { id: 'ag-pro', planType: 'agent', name: 'Pro', displayName: 'Agency Pro', price: 199.00, billingPeriod: 'monthly', entitlements: { customer_limit: 500, ai_analyses_per_month: 1000, crm_features: 'advanced', opportunity_tracking: true, analytics: true } }
    ]

    for (const plan of plans) {
        await prisma.plan.upsert({
            where: { id: plan.id },
            update: plan,
            create: plan
        })
    }

    // 3. Subscriptions
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

    // 4. Credits & Invoices
    await prisma.creditTransaction.create({
        data: {
            userId: ph1.id,
            amount: 15,
            transactionType: 'earn',
            balanceAfter: 15,
            description: 'Referral bonus'
        }
    })

    await prisma.activeSession.create({
        data: {
            userId: ph1.id,
            deviceName: 'MacBook Pro',
            deviceType: 'desktop',
            ipAddress: '192.168.1.1',
            location: 'Athens, Greece'
        }
    })

    console.log('Seeding finished.')
}

main()
    .then(async () => { await prisma.$disconnect() })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
