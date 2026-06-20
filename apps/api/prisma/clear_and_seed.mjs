import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearAll() {
  console.log('Connecting to database...');
  // Truncate all tables in public schema CASCADE
  const sql = `DO $$ DECLARE r RECORD; BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
      EXECUTE 'TRUNCATE TABLE "' || r.tablename || '" CASCADE';
    END LOOP;
  END $$;`;

  try {
    await prisma.$executeRawUnsafe(sql);
    console.log('All tables truncated (CASCADE).');
  } catch (err) {
    console.error('Error truncating tables:', err);
    throw err;
  }
}

async function seedMinimal() {
  console.log('Seeding minimal Organization and Branch...');
  const org = await prisma.organization.create({ data: { name: 'Niha Default', code: 'NIHA', currency: 'EGP' } });
  const branch = await prisma.branch.create({ data: { organizationId: org.id, name: 'Main Branch', code: 'MAIN' } });
  console.log('Seeded organization:', org.id, 'branch:', branch.id);
}

async function main() {
  try {
    await clearAll();
    await seedMinimal();
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
