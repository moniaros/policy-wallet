const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const hashedPassword = await bcrypt.hash('password123', 10);
    const email = 'agent1@example.com';

    const user = await prisma.user.update({
        where: { email },
        data: { password: hashedPassword }
    });

    console.log(`Updated user ${email} with password.`);
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
