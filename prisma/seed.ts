import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { seedCoverageTaxonomy, seedCoverageEnvelopes } from './seeds/coverage'
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
                policy_storage: 3,
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
            price: 2.99,
            billingPeriod: 'monthly',
            entitlements: {
                policy_storage: 10,
                ai_analyses_per_month: 5,
                notifications: 'basic', // or advanced?
                priority_processing: false,
                full_history: true
            }
        },
        {
            id: 'ph-pro',
            planType: 'policyholder',
            name: 'Pro',
            displayName: 'PolicyWallet Pro',
            price: 9.99,
            billingPeriod: 'monthly',
            entitlements: {
                policy_storage: 'unlimited',
                ai_analyses_per_month: 50,
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

    // 6. Gap Definitions
    console.log('Seeding Gap Definitions...')
    const gaps = [
        {
            slug: 'motor-theft',
            name: 'Theft Coverage',
            title: 'Missing Theft Protection',
            description: 'Your policy does not appear to cover theft, which is a significant risk in urban areas.',
            lineOfBusiness: 'motor',
            severity: 'high',
            defaultSeverity: 'high',
            ruleId: 'ai_check',
            detectionLogic: {
                check: "Does the policy explicitly cover theft, burglary, or stolen vehicle?"
            },
            isActive: true
        },
        {
            slug: 'motor-legal',
            name: 'Legal Protection',
            title: 'No Legal Protection',
            description: 'Legal expenses can be high. Consider adding legal protection.',
            lineOfBusiness: 'motor',
            severity: 'medium',
            defaultSeverity: 'medium',
            ruleId: 'ai_check',
            detectionLogic: {
                check: "Does the policy include 'Legal Protection' or 'Legal Assistance'?"
            },
            isActive: true
        },
        {
            slug: 'health-outpatient',
            name: 'Outpatient Care',
            title: 'Limited Outpatient Coverage',
            description: 'This policy might focus only on hospitalization, leaving you exposed for doctor visits and tests.',
            lineOfBusiness: 'health',
            severity: 'medium',
            defaultSeverity: 'medium',
            ruleId: 'ai_check',
            detectionLogic: {
                check: "Does this policy cover outpatient visits, diagnostic tests, or doctor consultations outside of a hospital?"
            },
            isActive: true
        },
        {
            slug: 'home-earthquake',
            name: 'Earthquake Coverage',
            title: 'Earthquake Vulnerability',
            description: 'Standard home policies often exclude earthquake damage unless explicitly added.',
            lineOfBusiness: 'home',
            severity: 'critical',
            defaultSeverity: 'critical',
            ruleId: 'ai_check',
            detectionLogic: {
                check: "Does the policy explicitly cover 'Earthquake' damage?"
            },
            isActive: true
        },
        // ─── Greek-market gap definitions (Phase 3B) ───────────────────
        {
            slug: 'missing_enfia_components',
            name: 'ENFIA Coverage Components',
            title: 'Incomplete ENFIA Coverage',
            description: 'Greek property tax (ENFIA) insurance requires fire, earthquake, AND flood coverage. One or more components are missing.',
            lineOfBusiness: 'home',
            severity: 'high',
            defaultSeverity: 'high',
            ruleId: 'acord_deterministic',
            detectionLogic: {
                rules: [
                    {
                        type: 'acord_field_check',
                        field: 'property',
                        operator: 'all_false',
                        fields: [
                            'property.fireCoverageIncluded',
                            'property.earthquakeCoverageIncluded',
                            'property.floodCoverageIncluded'
                        ]
                    }
                ],
                operator: 'AND'
            },
            isActive: true
        },
        {
            slug: 'missing_coordination_centre',
            name: 'Coordination Centre',
            title: 'Missing Coordination Centre',
            description: 'Greek health policies should specify a coordination centre (κέντρο συντονισμού) with a phone number for pre-authorization of hospital admissions.',
            lineOfBusiness: 'health',
            severity: 'medium',
            defaultSeverity: 'medium',
            ruleId: 'acord_deterministic',
            detectionLogic: {
                rules: [
                    {
                        type: 'acord_field_check',
                        field: 'health.coordinationCentre.phone',
                        operator: 'missing'
                    }
                ],
                operator: 'AND'
            },
            isActive: true
        },
        {
            slug: 'missing_leishmaniasis',
            name: 'Leishmaniasis Coverage',
            title: 'No Leishmaniasis Protection',
            description: 'Leishmaniasis (Λεϊσμανίαση) is endemic in Greece. Pet insurance without leishmaniasis coverage leaves a critical gap for dogs.',
            lineOfBusiness: 'pet',
            severity: 'high',
            defaultSeverity: 'high',
            ruleId: 'acord_deterministic',
            detectionLogic: {
                rules: [
                    {
                        type: 'acord_field_check',
                        field: 'pet.leishmaniaCovered',
                        operator: 'is_false'
                    }
                ],
                operator: 'AND'
            },
            isActive: true
        },
        {
            slug: 'green_card_expiring',
            name: 'Green Card Expiry',
            title: 'Green Card Expiring Soon',
            description: 'Your international motor insurance certificate (Green Card / Πράσινη Κάρτα) expires within 30 days. Renew before traveling abroad.',
            lineOfBusiness: 'motor',
            severity: 'medium',
            defaultSeverity: 'medium',
            ruleId: 'acord_deterministic',
            detectionLogic: {
                rules: [
                    {
                        type: 'date_within_days',
                        field: 'vehicle.greenCardExpiryDate',
                        withinDays: 30
                    }
                ],
                operator: 'AND'
            },
            isActive: true
        },
        {
            slug: 'low_deductible_premium_waste',
            name: 'Low Deductible Waste',
            title: 'Potential Premium Savings',
            description: 'Your deductible is at the minimum level, which means you may be paying higher premiums than necessary. Consider raising the deductible to reduce costs.',
            lineOfBusiness: 'all',
            severity: 'low',
            defaultSeverity: 'low',
            ruleId: 'ai_check',
            detectionLogic: {
                check: "Is the policy deductible/excess at the minimum available level for this type of coverage? If so, suggest raising it to reduce premium costs."
            },
            isActive: true
        }
    ]

    for (const gap of gaps) {
        await prisma.gapDefinition.upsert({
            where: { slug: gap.slug },
            update: gap,
            create: gap
        })
    }

    // 7. Insurance Product Catalog (Greek Market)
    console.log('Seeding Insurance Products...')
    const products = [
        {
            lineOfBusiness: 'motor',
            name: { en: 'Motor Insurance', el: 'Ασφάλεια Αυτοκινήτου' },
            description: { en: 'Comprehensive or third-party motor coverage for cars, motorcycles, and commercial vehicles.', el: 'Ολική ή ασφάλεια αστικής ευθύνης για αυτοκίνητα, μοτοσικλέτες και επαγγελματικά οχήματα.' },
            category: 'individual',
            estimatedAnnualPremium: 400,
            premiumRangeLow: 180,
            premiumRangeHigh: 1200,
            keyBenefits: [
                { en: 'Third-party liability (mandatory)', el: 'Αστική ευθύνη (υποχρεωτική)' },
                { en: 'Own damage / collision', el: 'Ίδιες ζημιές / σύγκρουση' },
                { en: 'Roadside assistance', el: 'Οδική βοήθεια' },
                { en: 'Legal protection', el: 'Νομική προστασία' },
            ],
            idealProfileTags: ['has_vehicles'],
            urgencyForProfiles: 'critical',
            greekMarketPopularity: 95,
            sortOrder: 1,
        },
        {
            lineOfBusiness: 'home',
            name: { en: 'Home Insurance', el: 'Ασφάλεια Κατοικίας' },
            description: { en: 'Coverage for fire, earthquake, flood, theft, and liability for homeowners and tenants.', el: 'Κάλυψη πυρκαγιάς, σεισμού, πλημμύρας, κλοπής και αστικής ευθύνης για ιδιοκτήτες και ενοικιαστές.' },
            category: 'individual',
            estimatedAnnualPremium: 250,
            premiumRangeLow: 100,
            premiumRangeHigh: 800,
            keyBenefits: [
                { en: 'Fire & natural disasters', el: 'Πυρκαγιά & φυσικές καταστροφές' },
                { en: 'Earthquake (ENFIA compliance)', el: 'Σεισμός (συμβατό με ΕΝΦΙΑ)' },
                { en: 'Theft & vandalism', el: 'Κλοπή & βανδαλισμοί' },
                { en: 'Tenant liability', el: 'Ευθύνη ενοικιαστή' },
            ],
            idealProfileTags: ['homeowner'],
            urgencyForProfiles: 'high',
            greekMarketPopularity: 60,
            sortOrder: 2,
        },
        {
            lineOfBusiness: 'health',
            name: { en: 'Private Health Insurance', el: 'Ιδιωτική Ασφάλεια Υγείας' },
            description: { en: 'Hospitalization, outpatient, and preventive care coverage supplementing ESY (Greek NHS).', el: 'Κάλυψη νοσηλείας, εξωτερικών ιατρείων και προληπτικών εξετάσεων ως συμπλήρωμα του ΕΣΥ.' },
            category: 'individual',
            estimatedAnnualPremium: 800,
            premiumRangeLow: 300,
            premiumRangeHigh: 3000,
            keyBenefits: [
                { en: 'Hospitalization (private rooms)', el: 'Νοσηλεία (ιδιωτικά δωμάτια)' },
                { en: 'Outpatient & diagnostics', el: 'Εξωτερικά ιατρεία & διαγνωστικά' },
                { en: 'Direct billing network', el: 'Δίκτυο απευθείας πληρωμών' },
                { en: 'Annual check-up', el: 'Ετήσιο check-up' },
            ],
            idealProfileTags: [],
            urgencyForProfiles: 'high',
            greekMarketPopularity: 75,
            sortOrder: 3,
        },
        {
            lineOfBusiness: 'life',
            name: { en: 'Life Insurance', el: 'Ασφάλεια Ζωής' },
            description: { en: 'Financial protection for dependents in case of death, disability, or critical illness.', el: 'Οικονομική προστασία εξαρτωμένων μελών σε περίπτωση θανάτου, αναπηρίας ή σοβαρής ασθένειας.' },
            category: 'individual',
            estimatedAnnualPremium: 600,
            premiumRangeLow: 200,
            premiumRangeHigh: 2500,
            keyBenefits: [
                { en: 'Death benefit', el: 'Παροχή θανάτου' },
                { en: 'Permanent disability', el: 'Μόνιμη αναπηρία' },
                { en: 'Critical illness cover', el: 'Κάλυψη σοβαρών ασθενειών' },
                { en: 'Mortgage protection', el: 'Προστασία στεγαστικού δανείου' },
            ],
            idealProfileTags: ['has_dependents', 'has_mortgage', 'has_loans'],
            urgencyForProfiles: 'critical',
            greekMarketPopularity: 50,
            sortOrder: 4,
        },
        {
            lineOfBusiness: 'travel',
            name: { en: 'Travel Insurance', el: 'Ταξιδιωτική Ασφάλεια' },
            description: { en: 'Coverage for medical emergencies, trip cancellation, and luggage loss while traveling.', el: 'Κάλυψη ιατρικών εκτάκτων, ακύρωσης ταξιδιού και απώλειας αποσκευών κατά τη διάρκεια ταξιδιού.' },
            category: 'individual',
            estimatedAnnualPremium: 80,
            premiumRangeLow: 30,
            premiumRangeHigh: 300,
            keyBenefits: [
                { en: 'Emergency medical abroad', el: 'Ιατρικά έκτακτα στο εξωτερικό' },
                { en: 'Trip cancellation', el: 'Ακύρωση ταξιδιού' },
                { en: 'Luggage protection', el: 'Προστασία αποσκευών' },
                { en: 'Repatriation', el: 'Επαναπατρισμός' },
            ],
            idealProfileTags: ['travels_frequently'],
            urgencyForProfiles: 'medium',
            greekMarketPopularity: 40,
            sortOrder: 5,
        },
        {
            lineOfBusiness: 'pet',
            name: { en: 'Pet Insurance', el: 'Ασφάλεια Κατοικίδιου' },
            description: { en: 'Veterinary costs, liability, and theft coverage for dogs and cats.', el: 'Κτηνιατρικά έξοδα, αστική ευθύνη και κάλυψη κλοπής για σκύλους και γάτες.' },
            category: 'individual',
            estimatedAnnualPremium: 150,
            premiumRangeLow: 80,
            premiumRangeHigh: 400,
            keyBenefits: [
                { en: 'Veterinary treatment', el: 'Κτηνιατρική περίθαλψη' },
                { en: 'Leishmaniasis coverage', el: 'Κάλυψη λεϊσμανίασης' },
                { en: 'Third-party liability', el: 'Αστική ευθύνη τρίτων' },
                { en: 'Theft / loss', el: 'Κλοπή / απώλεια' },
            ],
            idealProfileTags: ['has_pets'],
            urgencyForProfiles: 'low',
            greekMarketPopularity: 25,
            sortOrder: 6,
        },
        {
            lineOfBusiness: 'liability',
            name: { en: 'Professional Liability', el: 'Επαγγελματική Ευθύνη' },
            description: { en: 'Errors & omissions coverage for professionals and self-employed individuals.', el: 'Κάλυψη σφαλμάτων και παραλείψεων για επαγγελματίες και ελεύθερους επαγγελματίες.' },
            category: 'individual',
            estimatedAnnualPremium: 200,
            premiumRangeLow: 100,
            premiumRangeHigh: 1000,
            keyBenefits: [
                { en: 'Professional negligence defense', el: 'Υπεράσπιση επαγγελματικής αμέλειας' },
                { en: 'Client claims coverage', el: 'Κάλυψη αξιώσεων πελατών' },
                { en: 'Legal costs', el: 'Νομικά έξοδα' },
            ],
            idealProfileTags: ['self_employed'],
            urgencyForProfiles: 'medium',
            greekMarketPopularity: 30,
            sortOrder: 7,
        },
        {
            lineOfBusiness: 'legal_expenses',
            name: { en: 'Legal Expenses Insurance', el: 'Ασφάλεια Νομικής Προστασίας' },
            description: { en: 'Coverage for legal fees, court costs, and dispute resolution.', el: 'Κάλυψη δικηγορικών αμοιβών, δικαστικών εξόδων και επίλυσης διαφορών.' },
            category: 'individual',
            estimatedAnnualPremium: 120,
            premiumRangeLow: 60,
            premiumRangeHigh: 350,
            keyBenefits: [
                { en: 'Legal consultation', el: 'Νομική συμβουλή' },
                { en: 'Court representation', el: 'Δικαστική εκπροσώπηση' },
                { en: 'Dispute mediation', el: 'Διαμεσολάβηση διαφορών' },
            ],
            idealProfileTags: [],
            urgencyForProfiles: 'low',
            greekMarketPopularity: 20,
            sortOrder: 8,
        },
        {
            lineOfBusiness: 'income_protection',
            name: { en: 'Income Protection', el: 'Προστασία Εισοδήματος' },
            description: { en: 'Replaces income if you are unable to work due to illness or injury.', el: 'Αντικατάσταση εισοδήματος σε περίπτωση αδυναμίας εργασίας λόγω ασθένειας ή τραυματισμού.' },
            category: 'individual',
            estimatedAnnualPremium: 500,
            premiumRangeLow: 200,
            premiumRangeHigh: 1500,
            keyBenefits: [
                { en: 'Monthly income replacement', el: 'Μηνιαία αντικατάσταση εισοδήματος' },
                { en: 'Covers illness & accidents', el: 'Καλύπτει ασθένεια & ατυχήματα' },
                { en: 'Return-to-work support', el: 'Υποστήριξη επιστροφής στην εργασία' },
            ],
            idealProfileTags: ['has_dependents', 'self_employed'],
            urgencyForProfiles: 'high',
            greekMarketPopularity: 20,
            sortOrder: 9,
        },
    ]

    for (const product of products) {
        // Use upsert on lineOfBusiness + category combo
        const existing = await prisma.insuranceProduct.findFirst({
            where: { lineOfBusiness: product.lineOfBusiness, category: product.category },
        })
        if (existing) {
            await prisma.insuranceProduct.update({
                where: { id: existing.id },
                data: product as any,
            })
        } else {
            await prisma.insuranceProduct.create({ data: product as any })
        }
    }

    // 8. Questionnaire Templates
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

    // ── Ingestion pipeline reference data (Phase 0) ──────────────────
    console.log('Seeding coverage taxonomy + envelopes...')
    await seedCoverageTaxonomy(prisma)
    await seedCoverageEnvelopes(prisma)

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
