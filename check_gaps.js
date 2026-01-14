const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const count = await prisma.gapDefinition.count()
    console.log(`GapDefinition count: ${count}`)
    if (count > 0) {
        const gaps = await prisma.gapDefinition.findMany()
        console.log(gaps.map(g => `${g.slug} (${g.lineOfBusiness})`))
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
