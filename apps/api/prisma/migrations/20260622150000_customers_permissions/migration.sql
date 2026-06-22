-- Grant customers permissions to existing roles (idempotent)
INSERT INTO "Permission" ("id", "code", "label", "createdAt")
VALUES
  (gen_random_uuid(), 'customers.read', 'قراءة العملاء والبحث', CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'customers.manage', 'إدارة العملاء', CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r.id, p.id
FROM "Role" r
CROSS JOIN "Permission" p
WHERE r.name IN ('manager', 'Manager', 'cashier', 'Cashier')
  AND p.code = 'customers.read'
ON CONFLICT DO NOTHING;

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r.id, p.id
FROM "Role" r
CROSS JOIN "Permission" p
WHERE r.name IN ('manager', 'Manager')
  AND p.code = 'customers.manage'
ON CONFLICT DO NOTHING;
