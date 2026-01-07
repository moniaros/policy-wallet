import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

async function main() {
    const users = await prisma.user.findMany({
        take: 5,
        select: { id: true, email: true }
    })
    users.forEach(u => console.log(`${u.id} | ${u.email}`))
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
