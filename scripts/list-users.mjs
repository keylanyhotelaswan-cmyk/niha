import pkg from '@prisma/client';
const { PrismaClient } = pkg;
(async () => {
  const p = new PrismaClient();
  const users = await p.user.findMany();
  console.log(users.map(u => ({ username: u.username, passwordHash: (u.passwordHash || '').slice(0, 100) })));
  await p.$disconnect();
})();
