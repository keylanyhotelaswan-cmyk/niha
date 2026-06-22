import { PrismaClient, BranchStatus, PaymentMethodType, UserStatus } from '@prisma/client';
import { seedNihaYamMenu } from './seed-menu.mjs';

const prisma = new PrismaClient();

const permissionSeeds = [
  ['dashboard.view', 'عرض مؤشرات التشغيل'],
  ['pos.use', 'تشغيل شاشة البيع'],
  ['shifts.access', 'عرض وفتح الوردية من نقطة البيع'],
  ['orders.approve_collection', 'اعتماد التحصيلات'],
  ['treasury.manage', 'إدارة الخزنة والورديات'],
  ['inventory.manage', 'إدارة المخزون والوصفات'],
  ['reports.view', 'عرض التقارير'],
  ['setup_costs.manage', 'إدارة مصروفات التأسيس'],
  ['expenses.manage', 'إدارة المصروفات التشغيلية'],
  ['users.manage', 'إدارة المستخدمين والصلاحيات'],
  ['branches.read', 'قراءة الفروع'],
  ['products.read', 'قراءة المنتجات'],
  ['product-categories.read', 'قراءة فئات المنتجات'],
  ['stock-items.read', 'قراءة أصناف المخزون'],
  ['customers.read', 'قراءة العملاء والبحث'],
  ['customers.manage', 'إدارة العملاء'],
];

const rolePermissions = {
  manager: [
    'dashboard.view',
    'pos.use',
    'orders.approve_collection',
    'shifts.access',
    'treasury.manage',
    'inventory.manage',
    'reports.view',
    'setup_costs.manage',
    'expenses.manage',
    'users.manage',
    'branches.read',
    'products.read',
    'product-categories.read',
    'customers.read',
    'customers.manage',
  ],
  cashier: ['pos.use', 'shifts.access', 'branches.read', 'products.read', 'product-categories.read', 'stock-items.read', 'customers.read'],
  accountant: ['dashboard.view', 'orders.approve_collection', 'shifts.access', 'treasury.manage', 'reports.view', 'expenses.manage'],
};

const passwordHash = '$2b$10$9vmSdvIti1ai6guKenfSX.uXppNqqZ4gbAC8lupfxrqBgvzg/by.e'; // password

async function main() {
  const organization = await prisma.organization.upsert({
    where: { code: 'NIHA' },
    update: { name: 'نيها يم - أسوان', currency: 'EGP', timezone: 'Africa/Cairo' },
    create: { name: 'نيها يم - أسوان', code: 'NIHA', currency: 'EGP', timezone: 'Africa/Cairo' },
  });

  const branch = await prisma.branch.upsert({
    where: {
      organizationId_code: {
        organizationId: organization.id,
        code: 'MAIN',
      },
    },
    update: { name: 'نيها يم - أسوان', status: BranchStatus.ACTIVE },
    create: {
      organizationId: organization.id,
      name: 'نيها يم - أسوان',
      code: 'MAIN',
      status: BranchStatus.ACTIVE,
    },
  });

  await prisma.cashBox.upsert({
    where: { branchId_code: { branchId: branch.id, code: 'POS-1' } },
    update: { name: 'خزنة الكاشير الرئيسية' },
    create: { branchId: branch.id, name: 'خزنة الكاشير الرئيسية', code: 'POS-1' },
  });

  await prisma.warehouse.upsert({
    where: { branchId_code: { branchId: branch.id, code: 'MAIN-WH' } },
    update: { name: 'مخزن التشغيل الرئيسي' },
    create: { branchId: branch.id, name: 'مخزن التشغيل الرئيسي', code: 'MAIN-WH' },
  });

  const unitEach = await prisma.unit.upsert({
    where: { code: 'EA' },
    update: { name: 'قطعة', precision: 0 },
    create: { code: 'EA', name: 'قطعة', precision: 0 },
  });

  await prisma.unit.upsert({
    where: { code: 'KG' },
    update: { name: 'كجم', precision: 3 },
    create: { code: 'KG', name: 'كجم', precision: 3 },
  });

  await prisma.unit.upsert({
    where: { code: 'L' },
    update: { name: 'لتر', precision: 3 },
    create: { code: 'L', name: 'لتر', precision: 3 },
  });

  await Promise.all([
    prisma.paymentMethod.upsert({
      where: { branchId_code: { branchId: branch.id, code: 'CASH' } },
      update: { name: 'نقدي', type: PaymentMethodType.CASH, isDefault: true, sortOrder: 1 },
      create: { branchId: branch.id, name: 'نقدي', code: 'CASH', type: PaymentMethodType.CASH, isDefault: true, sortOrder: 1 },
    }),
    prisma.paymentMethod.upsert({
      where: { branchId_code: { branchId: branch.id, code: 'CARD' } },
      update: { name: 'بطاقة', type: PaymentMethodType.CARD, sortOrder: 4, isActive: false },
      create: { branchId: branch.id, name: 'بطاقة', code: 'CARD', type: PaymentMethodType.CARD, sortOrder: 4, isActive: false },
    }),
    prisma.paymentMethod.upsert({
      where: { branchId_code: { branchId: branch.id, code: 'INSTAPAY' } },
      update: { name: 'انستاباي', type: PaymentMethodType.INSTAPAY, sortOrder: 2 },
      create: { branchId: branch.id, name: 'انستاباي', code: 'INSTAPAY', type: PaymentMethodType.INSTAPAY, sortOrder: 2 },
    }),
    prisma.paymentMethod.upsert({
      where: { branchId_code: { branchId: branch.id, code: 'WALLET' } },
      update: { name: 'محفظة', type: PaymentMethodType.WALLET, sortOrder: 3 },
      create: { branchId: branch.id, name: 'محفظة', code: 'WALLET', type: PaymentMethodType.WALLET, sortOrder: 3 },
    }),
  ]);

  const menuStats = await seedNihaYamMenu(prisma, branch.id);
  console.log(`Menu seeded: ${menuStats.categories} categories, ${menuStats.products} products.`);

  await Promise.all([
    prisma.expenseCategory.upsert({
      where: { branchId_code: { branchId: branch.id, code: 'RENT' } },
      update: { name: 'إيجار' },
      create: { branchId: branch.id, code: 'RENT', name: 'إيجار' },
    }),
    prisma.expenseCategory.upsert({
      where: { branchId_code: { branchId: branch.id, code: 'UTIL' } },
      update: { name: 'مرافق وتشغيل' },
      create: { branchId: branch.id, code: 'UTIL', name: 'مرافق وتشغيل' },
    }),
  ]);

  await Promise.all([
    prisma.setupCategory.upsert({
      where: { name: 'معدات' },
      update: {},
      create: { name: 'معدات' },
    }),
    prisma.setupCategory.upsert({
      where: { name: 'تشطيبات' },
      update: {},
      create: { name: 'تشطيبات' },
    }),
  ]);

  const permissions = {};
  for (const [code, label] of permissionSeeds) {
    permissions[code] = await prisma.permission.upsert({
      where: { code },
      update: { label },
      create: { code, label },
    });
  }

  const roleSeeds = [
    ['manager', 'Manager', 'مدير النظام'],
    ['cashier', 'Cashier', 'كاشير'],
    ['accountant', 'Accountant', 'محاسب'],
  ];

  const roles = {};
  for (const [code, name] of roleSeeds) {
    roles[code] = await prisma.role.upsert({
      where: { code },
      update: { name },
      create: { code, name },
    });
  }

  for (const [roleCode, permissionCodes] of Object.entries(rolePermissions)) {
    for (const permissionCode of permissionCodes) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: roles[roleCode].id,
            permissionId: permissions[permissionCode].id,
          },
        },
        update: {},
        create: {
          roleId: roles[roleCode].id,
          permissionId: permissions[permissionCode].id,
        },
      });
    }
  }

  const users = [
    ['manager', 'مدير التشغيل', 'manager'],
    ['cashier', 'كاشير الوردية', 'cashier'],
    ['accountant', 'محاسب الفرع', 'accountant'],
  ];

  for (const [username, fullName, roleCode] of users) {
    const user = await prisma.user.upsert({
      where: { username },
      update: { fullName, organizationId: organization.id, status: UserStatus.ACTIVE, passwordHash },
      create: {
        username,
        fullName,
        organizationId: organization.id,
        status: UserStatus.ACTIVE,
        passwordHash,
      },
    });

    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: user.id,
          roleId: roles[roleCode].id,
        },
      },
      update: {},
      create: {
        userId: user.id,
        roleId: roles[roleCode].id,
      },
    });
  }

  console.log('Seed completed successfully.');
}

main()
  .catch((error) => {
    console.error('Seed failed.');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });