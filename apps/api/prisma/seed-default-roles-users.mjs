import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function up() {
  console.log('Seeding permissions and roles...');

  const perms = [
    { code: 'users.manage', label: 'Manage users' },
    { code: 'pos.use', label: 'Use POS' },
    { code: 'shifts.access', label: 'View open shift from POS' },
    { code: 'treasury.manage', label: 'Manage treasury' },
    { code: 'reports.view', label: 'View reports' },
    { code: 'inventory.manage', label: 'Manage inventory' },
    { code: 'vendor_accounts.view', label: 'View vendor accounts' },
    { code: 'vendor_accounts.manage', label: 'Manage vendor accounts' },
    { code: 'setup_costs.manage', label: 'Manage setup costs' },
    { code: 'accounting.view', label: 'View accounting' },
  ];

  for (const p of perms) {
    await prisma.permission.upsert({ where: { code: p.code }, update: {}, create: p });
  }

  const roles = [
    { name: 'Manager', code: 'manager' },
    { name: 'Cashier', code: 'cashier' },
    { name: 'Accountant', code: 'accountant' },
  ];

  for (const r of roles) {
    await prisma.role.upsert({ where: { code: r.code }, update: {}, create: r });
  }

  const roleMap = {};
  const allRoles = await prisma.role.findMany();
  for (const r of allRoles) roleMap[r.code] = r;

  const permMap = {};
  const allPerms = await prisma.permission.findMany();
  for (const p of allPerms) permMap[p.code] = p;

  // assign permissions
  const assign = async (roleCode, permCodes) => {
    const role = roleMap[roleCode];
    for (const pc of permCodes) {
      const perm = permMap[pc];
      if (!perm) continue;
      await prisma.rolePermission.upsert({ where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } }, update: {}, create: { roleId: role.id, permissionId: perm.id } });
    }
  };

  await assign('manager', ['users.manage', 'pos.use', 'treasury.manage', 'reports.view', 'inventory.manage', 'vendor_accounts.view', 'vendor_accounts.manage', 'setup_costs.manage']);
  await assign('cashier', ['pos.use', 'shifts.access']);
  await assign('accountant', ['reports.view', 'accounting.view', 'vendor_accounts.view', 'vendor_accounts.manage']);

  // create users
  console.log('Seeding users...');
  const org = await prisma.organization.findFirst();
  const branch = await prisma.branch.findFirst();
  if (!org || !branch) throw new Error('Organization/Branch not found. Run clear_and_seed first.');

  const users = [
    { username: 'manager', fullName: 'Default Manager', password: '123456789', role: 'manager' },
    { username: 'cashier', fullName: 'Default Cashier', password: '741523', role: 'cashier' },
    { username: 'accountant', fullName: 'Default Accountant', password: 'seed-reset-before-production', role: 'accountant' },
  ];

  for (const u of users) {
    const existing = await prisma.user.findUnique({ where: { username: u.username } });
    let userRecord;
    if (existing) {
      userRecord = existing;
    } else {
      const hashed = await bcrypt.hash(u.password, 10);
      userRecord = await prisma.user.create({ data: { organizationId: org.id, fullName: u.fullName, username: u.username, passwordHash: hashed } });
    }

    const role = roleMap[u.role];
    if (role) {
      await prisma.userRole.upsert({ where: { userId_roleId: { userId: userRecord.id, roleId: role.id } }, update: {}, create: { userId: userRecord.id, roleId: role.id } });
    }
  }

  console.log('Seed complete.');
}

up()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
