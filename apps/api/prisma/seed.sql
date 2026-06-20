INSERT INTO "Organization" ("id", "name", "code", "currency", "timezone", "createdAt", "updatedAt")
VALUES (
  '7d94f65d-4d8c-4a2d-8ad0-f5e8ff365001',
  'تشغيل المطعم',
  'NIHA',
  'EGP',
  'Africa/Cairo',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("code") DO UPDATE
SET "name" = EXCLUDED."name",
    "currency" = EXCLUDED."currency",
    "timezone" = EXCLUDED."timezone",
    "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "Branch" ("id", "organizationId", "name", "code", "status", "createdAt", "updatedAt")
VALUES (
  '6cb17d35-3c20-4b14-b47e-80c85005b001',
  '7d94f65d-4d8c-4a2d-8ad0-f5e8ff365001',
  'الفرع الرئيسي',
  'MAIN',
  'ACTIVE',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("organizationId", "code") DO UPDATE
SET "name" = EXCLUDED."name",
    "status" = EXCLUDED."status",
    "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "CashBox" ("id", "branchId", "name", "code", "createdAt")
VALUES (
  'b137b58a-8df7-43f9-a89a-615c1917c001',
  '6cb17d35-3c20-4b14-b47e-80c85005b001',
  'خزنة الكاشير الرئيسية',
  'POS-1',
  CURRENT_TIMESTAMP
)
ON CONFLICT ("branchId", "code") DO UPDATE
SET "name" = EXCLUDED."name";

INSERT INTO "Warehouse" ("id", "branchId", "name", "code")
VALUES (
  '2f298f86-aafe-4ca9-af3f-9d21d08c5001',
  '6cb17d35-3c20-4b14-b47e-80c85005b001',
  'مخزن التشغيل الرئيسي',
  'MAIN-WH'
)
ON CONFLICT ("branchId", "code") DO UPDATE
SET "name" = EXCLUDED."name";

INSERT INTO "Unit" ("id", "code", "name", "precision")
VALUES
  ('8d89d0fb-22b6-4b5e-a5c0-dff3c3011001', 'EA', 'قطعة', 0),
  ('8d89d0fb-22b6-4b5e-a5c0-dff3c3011002', 'KG', 'كجم', 3),
  ('8d89d0fb-22b6-4b5e-a5c0-dff3c3011003', 'L', 'لتر', 3)
ON CONFLICT ("code") DO UPDATE
SET "name" = EXCLUDED."name",
    "precision" = EXCLUDED."precision";

INSERT INTO "PaymentMethod" ("id", "branchId", "name", "code", "type", "sortOrder", "isDefault", "isActive", "createdAt")
VALUES
  ('5f73949f-ec44-4ae7-bf68-3c9590cb2001', '6cb17d35-3c20-4b14-b47e-80c85005b001', 'نقدي', 'CASH', 'CASH', 1, true, true, CURRENT_TIMESTAMP),
  ('5f73949f-ec44-4ae7-bf68-3c9590cb2002', '6cb17d35-3c20-4b14-b47e-80c85005b001', 'بطاقة', 'CARD', 'CARD', 2, false, true, CURRENT_TIMESTAMP),
  ('5f73949f-ec44-4ae7-bf68-3c9590cb2003', '6cb17d35-3c20-4b14-b47e-80c85005b001', 'محفظة', 'WALLET', 'WALLET', 3, false, true, CURRENT_TIMESTAMP)
ON CONFLICT ("branchId", "code") DO UPDATE
SET "name" = EXCLUDED."name",
    "type" = EXCLUDED."type",
    "sortOrder" = EXCLUDED."sortOrder",
    "isDefault" = EXCLUDED."isDefault",
    "isActive" = EXCLUDED."isActive";

INSERT INTO "ProductCategory" ("id", "branchId", "name", "createdAt")
VALUES
  ('37b4f15c-e5eb-4faa-b8b0-9ebd95f53001', '6cb17d35-3c20-4b14-b47e-80c85005b001', 'ساندوتشات', CURRENT_TIMESTAMP),
  ('37b4f15c-e5eb-4faa-b8b0-9ebd95f53002', '6cb17d35-3c20-4b14-b47e-80c85005b001', 'مشروبات', CURRENT_TIMESTAMP)
ON CONFLICT ("branchId", "name") DO NOTHING;

INSERT INTO "Product" ("id", "branchId", "categoryId", "name", "sku", "salePrice", "estimatedCost", "isAvailable", "createdAt")
VALUES
  ('5cf39ce1-2afd-4d5f-93b6-bbfe37f44001', '6cb17d35-3c20-4b14-b47e-80c85005b001', '37b4f15c-e5eb-4faa-b8b0-9ebd95f53001', 'ساندوتش شاورما', 'SHAW-001', 95, 41, true, CURRENT_TIMESTAMP),
  ('5cf39ce1-2afd-4d5f-93b6-bbfe37f44002', '6cb17d35-3c20-4b14-b47e-80c85005b001', '37b4f15c-e5eb-4faa-b8b0-9ebd95f53002', 'أمريكانو', 'AMER-001', 45, 12, true, CURRENT_TIMESTAMP)
ON CONFLICT ("branchId", "sku") DO UPDATE
SET "name" = EXCLUDED."name",
    "salePrice" = EXCLUDED."salePrice",
    "estimatedCost" = EXCLUDED."estimatedCost",
    "isAvailable" = EXCLUDED."isAvailable";

INSERT INTO "ExpenseCategory" ("id", "branchId", "name", "code", "createdAt")
VALUES
  ('2c2cacad-72f8-47f9-bde2-0eead4ac7001', '6cb17d35-3c20-4b14-b47e-80c85005b001', 'إيجار', 'RENT', CURRENT_TIMESTAMP),
  ('2c2cacad-72f8-47f9-bde2-0eead4ac7002', '6cb17d35-3c20-4b14-b47e-80c85005b001', 'مرافق وتشغيل', 'UTIL', CURRENT_TIMESTAMP)
ON CONFLICT ("branchId", "code") DO UPDATE
SET "name" = EXCLUDED."name";

INSERT INTO "SetupCategory" ("id", "name", "createdAt")
VALUES
  ('c95fdc9e-9ab0-4138-8c1a-cf1cda366001', 'معدات', CURRENT_TIMESTAMP),
  ('c95fdc9e-9ab0-4138-8c1a-cf1cda366002', 'تشطيبات', CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "Permission" ("id", "code", "label", "createdAt")
VALUES
  ('a5eb0ae7-03f0-4f01-84a0-4c2288f12001', 'dashboard.view', 'عرض مؤشرات التشغيل', CURRENT_TIMESTAMP),
  ('a5eb0ae7-03f0-4f01-84a0-4c2288f12002', 'pos.use', 'تشغيل شاشة البيع', CURRENT_TIMESTAMP),
  ('a5eb0ae7-03f0-4f01-84a0-4c2288f12003', 'orders.approve_collection', 'اعتماد التحصيلات', CURRENT_TIMESTAMP),
  ('a5eb0ae7-03f0-4f01-84a0-4c2288f12004', 'treasury.manage', 'إدارة الخزنة والورديات', CURRENT_TIMESTAMP),
  ('a5eb0ae7-03f0-4f01-84a0-4c2288f12005', 'inventory.manage', 'إدارة المخزون والوصفات', CURRENT_TIMESTAMP),
  ('a5eb0ae7-03f0-4f01-84a0-4c2288f12006', 'reports.view', 'عرض التقارير', CURRENT_TIMESTAMP),
  ('a5eb0ae7-03f0-4f01-84a0-4c2288f12007', 'setup_costs.manage', 'إدارة مصروفات التأسيس', CURRENT_TIMESTAMP),
  ('a5eb0ae7-03f0-4f01-84a0-4c2288f12008', 'expenses.manage', 'إدارة المصروفات التشغيلية', CURRENT_TIMESTAMP),
  ('a5eb0ae7-03f0-4f01-84a0-4c2288f12009', 'users.manage', 'إدارة المستخدمين والصلاحيات', CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO UPDATE
SET "label" = EXCLUDED."label";

INSERT INTO "Role" ("id", "name", "code", "createdAt")
VALUES
  ('51023343-145d-4f24-b1ae-9da6e54cc001', 'Manager', 'manager', CURRENT_TIMESTAMP),
  ('51023343-145d-4f24-b1ae-9da6e54cc002', 'Cashier', 'cashier', CURRENT_TIMESTAMP),
  ('51023343-145d-4f24-b1ae-9da6e54cc003', 'Accountant', 'accountant', CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO UPDATE
SET "name" = EXCLUDED."name";

INSERT INTO "RolePermission" ("roleId", "permissionId")
VALUES
  ('51023343-145d-4f24-b1ae-9da6e54cc001', 'a5eb0ae7-03f0-4f01-84a0-4c2288f12001'),
  ('51023343-145d-4f24-b1ae-9da6e54cc001', 'a5eb0ae7-03f0-4f01-84a0-4c2288f12002'),
  ('51023343-145d-4f24-b1ae-9da6e54cc001', 'a5eb0ae7-03f0-4f01-84a0-4c2288f12003'),
  ('51023343-145d-4f24-b1ae-9da6e54cc001', 'a5eb0ae7-03f0-4f01-84a0-4c2288f12004'),
  ('51023343-145d-4f24-b1ae-9da6e54cc001', 'a5eb0ae7-03f0-4f01-84a0-4c2288f12005'),
  ('51023343-145d-4f24-b1ae-9da6e54cc001', 'a5eb0ae7-03f0-4f01-84a0-4c2288f12006'),
  ('51023343-145d-4f24-b1ae-9da6e54cc001', 'a5eb0ae7-03f0-4f01-84a0-4c2288f12007'),
  ('51023343-145d-4f24-b1ae-9da6e54cc001', 'a5eb0ae7-03f0-4f01-84a0-4c2288f12008'),
  ('51023343-145d-4f24-b1ae-9da6e54cc001', 'a5eb0ae7-03f0-4f01-84a0-4c2288f12009'),
  ('51023343-145d-4f24-b1ae-9da6e54cc002', 'a5eb0ae7-03f0-4f01-84a0-4c2288f12001'),
  ('51023343-145d-4f24-b1ae-9da6e54cc002', 'a5eb0ae7-03f0-4f01-84a0-4c2288f12002'),
  ('51023343-145d-4f24-b1ae-9da6e54cc003', 'a5eb0ae7-03f0-4f01-84a0-4c2288f12001'),
  ('51023343-145d-4f24-b1ae-9da6e54cc003', 'a5eb0ae7-03f0-4f01-84a0-4c2288f12003'),
  ('51023343-145d-4f24-b1ae-9da6e54cc003', 'a5eb0ae7-03f0-4f01-84a0-4c2288f12004'),
  ('51023343-145d-4f24-b1ae-9da6e54cc003', 'a5eb0ae7-03f0-4f01-84a0-4c2288f12006'),
  ('51023343-145d-4f24-b1ae-9da6e54cc003', 'a5eb0ae7-03f0-4f01-84a0-4c2288f12008')
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

INSERT INTO "User" ("id", "organizationId", "fullName", "username", "passwordHash", "status", "createdAt", "updatedAt")
VALUES
  ('ed76df7f-ff1e-4df1-a592-61fcb56de001', '7d94f65d-4d8c-4a2d-8ad0-f5e8ff365001', 'مدير التشغيل', 'manager', 'seed-reset-before-production', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('ed76df7f-ff1e-4df1-a592-61fcb56de002', '7d94f65d-4d8c-4a2d-8ad0-f5e8ff365001', 'كاشير الوردية', 'cashier', 'seed-reset-before-production', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('ed76df7f-ff1e-4df1-a592-61fcb56de003', '7d94f65d-4d8c-4a2d-8ad0-f5e8ff365001', 'محاسب الفرع', 'accountant', 'seed-reset-before-production', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("username") DO UPDATE
SET "fullName" = EXCLUDED."fullName",
    "organizationId" = EXCLUDED."organizationId",
    "status" = EXCLUDED."status",
    "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "UserRole" ("userId", "roleId")
VALUES
  ('ed76df7f-ff1e-4df1-a592-61fcb56de001', '51023343-145d-4f24-b1ae-9da6e54cc001'),
  ('ed76df7f-ff1e-4df1-a592-61fcb56de002', '51023343-145d-4f24-b1ae-9da6e54cc002'),
  ('ed76df7f-ff1e-4df1-a592-61fcb56de003', '51023343-145d-4f24-b1ae-9da6e54cc003')
ON CONFLICT ("userId", "roleId") DO NOTHING;