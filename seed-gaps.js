const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
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
        }
    ]

    for (const gap of gaps) {
        await prisma.gapDefinition.upsert({
            where: { slug: gap.slug },
            update: gap,
            create: gap
        })
        console.log(`Upserted Gap: ${gap.slug}`)
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
