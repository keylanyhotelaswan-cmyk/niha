import pkg from '@prisma/client';
import bcrypt from 'bcrypt';
const { PrismaClient } = pkg;
(async () => {
  const prisma = new PrismaClient();
  try {
    const users = await prisma.user.findMany();
    for (const u of users) {
      if (u.passwordHash === 'seed-reset-before-production') {
        const hash = await bcrypt.hash('seed-reset-before-production', 10);
        await prisma.user.update({ where: { id: u.id }, data: { passwordHash: hash } });
        console.log(`Updated ${u.username}`);
      }
    }
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
})();
