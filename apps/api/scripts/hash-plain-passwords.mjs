import pkg from '@prisma/client';
import bcrypt from 'bcrypt';
const { PrismaClient } = pkg;

(async () => {
  const prisma = new PrismaClient();
  try {
    const users = await prisma.user.findMany();
    for (const u of users) {
      const ph = u.passwordHash;
      if (!ph) continue;
      // bcrypt hashes start with $2a$ or $2b$ or similar
      if (typeof ph === 'string' && !ph.startsWith('$2')) {
        const hash = await bcrypt.hash(ph, 10);
        await prisma.user.update({ where: { id: u.id }, data: { passwordHash: hash } });
        console.log(`Hashed password for ${u.username}`);
      }
    }
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
})();
