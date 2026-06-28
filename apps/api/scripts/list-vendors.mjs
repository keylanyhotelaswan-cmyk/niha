import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const vendors = await prisma.vendor.findMany({
  include: { branch: { select: { id: true, name: true } } },
  orderBy: { createdAt: 'desc' },
});
console.log(JSON.stringify(vendors, null, 2));
await prisma.$disconnect();
