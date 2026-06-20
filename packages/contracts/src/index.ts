export type HealthCheckResponse = {
  status: 'ok';
  service: string;
  timezone: string | undefined;
  currency: string | undefined;
};

// Auth Types
export const UserStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const;

export type UserStatus = typeof UserStatus[keyof typeof UserStatus];

export type User = {
  id: string;
  organizationId: string;
  fullName: string;
  username: string;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateUserDto = {
  organizationId: string;
  fullName: string;
  username: string;
  password: string;
};

export type UpdateUserDto = {
  fullName?: string;
  username?: string;
  password?: string;
  status?: UserStatus;
};

export type Role = {
  id: string;
  name: string;
  code: string;
  createdAt: Date;
};

export type CreateRoleDto = {
  name: string;
  code: string;
};

export type Permission = {
  id: string;
  code: string;
  label: string;
  createdAt: Date;
};

export type CreatePermissionDto = {
  code: string;
  label: string;
};

export type RolePermission = {
  roleId: string;
  permissionId: string;
};

export type UserRole = {
  userId: string;
  roleId: string;
};

export type AssignRoleDto = {
  userId: string;
  roleId: string;
};

export type AssignPermissionDto = {
  roleId: string;
  permissionId: string;
};

export type LoginDto = {
  username: string;
  password: string;
};

export type LoginResponse = {
  accessToken: string;
  user: User;
  roles: Role[];
  permissions: Permission[];
};

export type JwtPayload = {
  sub: string;
  username: string;
  organizationId: string;
};

// Branch Types
export const BranchStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const;

export type BranchStatus = typeof BranchStatus[keyof typeof BranchStatus];

export type Branch = {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  status: BranchStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateBranchDto = {
  organizationId: string;
  name: string;
  code: string;
};

export type UpdateBranchDto = {
  name?: string;
  status?: BranchStatus;
};

// Organization Types
export type Organization = {
  id: string;
  name: string;
  code: string;
  currency: string;
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateOrganizationDto = {
  name: string;
  code: string;
  currency?: string;
  timezone?: string;
};

export type UpdateOrganizationDto = {
  name?: string;
  currency?: string;
  timezone?: string;
};

// Catalog Types - ProductCategory
export type ProductCategory = {
  id: string;
  branchId: string;
  name: string;
  createdAt: Date;
};

export type CreateProductCategoryDto = {
  branchId: string;
  name: string;
};

export type UpdateProductCategoryDto = {
  name?: string;
};

// Catalog Types - Product
export const ProductStatusType = {
  AVAILABLE: 'AVAILABLE',
  UNAVAILABLE: 'UNAVAILABLE',
  DISCONTINUED: 'DISCONTINUED',
} as const;

export type ProductStatusType = typeof ProductStatusType[keyof typeof ProductStatusType];

export type Product = {
  id: string;
  branchId: string;
  categoryId: string;
  name: string;
  sku: string | null;
  salePrice: number;
  estimatedCost: number | null;
  isAvailable: boolean;
  createdAt: Date;
};

export type CreateProductDto = {
  branchId: string;
  categoryId: string;
  name: string;
  sku?: string | null;
  salePrice: number;
  estimatedCost?: number | null;
  isAvailable?: boolean;
};

export type UpdateProductDto = {
  categoryId?: string;
  name?: string;
  sku?: string | null;
  salePrice?: number;
  estimatedCost?: number | null;
  isAvailable?: boolean;
};

// Catalog Types - ProductPrice
export type ProductPrice = {
  id: string;
  productId: string;
  label: string;
  amount: number;
  activeFrom: Date;
  activeTo: Date | null;
  isDefault: boolean;
};

export type CreateProductPriceDto = {
  productId: string;
  label: string;
  amount: number;
  activeFrom?: Date;
  activeTo?: Date | null;
  isDefault?: boolean;
};

export type UpdateProductPriceDto = {
  label?: string;
  amount?: number;
  activeFrom?: Date;
  activeTo?: Date | null;
  isDefault?: boolean;
};

// ---------- Inventory Types ----------

// Unit - وحدات القياس (غير مرتبطة بفرع - عالمية)
export type Unit = {
  id: string;
  code: string;
  name: string;
  precision: number;
};

export type CreateUnitDto = {
  code: string;
  name: string;
  precision?: number;
};

export type UpdateUnitDto = {
  name?: string;
  precision?: number;
};

// UnitConversion - تحويل الوحدات
export type UnitConversion = {
  id: string;
  fromUnitId: string;
  toUnitId: string;
  factor: number;
};

export type CreateUnitConversionDto = {
  fromUnitId: string;
  toUnitId: string;
  factor: number;
};

export type UpdateUnitConversionDto = {
  factor?: number;
};

// Warehouse - المستودعات
export type Warehouse = {
  id: string;
  branchId: string;
  name: string;
  code: string;
};

export type CreateWarehouseDto = {
  branchId: string;
  name: string;
  code: string;
};

export type UpdateWarehouseDto = {
  name?: string;
  code?: string;
};

// StockItem - العناصر المخزنية
export type StockItem = {
  id: string;
  branchId: string;
  warehouseId: string;
  unitId: string;
  name: string;
  code: string;
  reorderPoint: number;
  onHandQuantity: number;
  averageCost: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateStockItemDto = {
  branchId: string;
  warehouseId: string;
  unitId: string;
  name: string;
  code: string;
  reorderPoint?: number;
  onHandQuantity?: number;
  averageCost?: number;
  isActive?: boolean;
};

export type UpdateStockItemDto = {
  name?: string;
  code?: string;
  unitId?: string;
  warehouseId?: string;
  reorderPoint?: number;
  isActive?: boolean;
};

// ---------- Recipes Types ----------

// RecipeStatus - حالة إصدار الوصفة
export const RecipeStatus = {
  ACTIVE: 'ACTIVE',
  ARCHIVED: 'ARCHIVED',
} as const;

export type RecipeStatus = typeof RecipeStatus[keyof typeof RecipeStatus];

// Recipe - الوصفة (تربط المنتج بوصفته)
export type Recipe = {
  id: string;
  branchId: string;
  productId: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateRecipeDto = {
  branchId: string;
  productId: string;
  name: string;
  isActive?: boolean;
};

export type UpdateRecipeDto = {
  name?: string;
  productId?: string;
  isActive?: boolean;
};

// RecipeVersion - إصدار الوصفة
export type RecipeVersion = {
  id: string;
  recipeId: string;
  versionNumber: number;
  yieldQuantity: number;
  yieldUnitId: string | null;
  wastePercent: number;
  totalCost: number;
  status: RecipeStatus;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  createdById: string | null;
  createdAt: Date;
};

export type CreateRecipeVersionDto = {
  recipeId: string;
  yieldQuantity?: number;
  yieldUnitId?: string | null;
  wastePercent?: number;
  effectiveFrom?: Date;
  effectiveTo?: Date | null;
  components?: CreateRecipeComponentDto[];
};

export type UpdateRecipeVersionDto = {
  yieldQuantity?: number;
  yieldUnitId?: string | null;
  wastePercent?: number;
  effectiveFrom?: Date;
  effectiveTo?: Date | null;
  status?: RecipeStatus;
};

// ---------- Orders Types ----------

// Order - الفاتورة / الطلب
export const OrderType = {
  DINE_IN: 'DINE_IN',
  EAT_IN: 'EAT_IN',
  TAKEAWAY: 'TAKEAWAY',
} as const;
export type OrderType = typeof OrderType[keyof typeof OrderType];

export const PaymentMethod = {
  CASH: 'CASH',
  CARD: 'CARD',
  INSTAPAY: 'INSTAPAY',
  WALLET: 'WALLET',
  MIXED: 'MIXED',
} as const;
export type PaymentMethod = typeof PaymentMethod[keyof typeof PaymentMethod];

export type Order = {
  id: string;
  branchId: string;
  code: string;
  orderType: OrderType;
  total: number;
  discountAmount: number;
  paymentMethod: PaymentMethod;
  orderNote: string | null;
  status: string;
  createdById: string | null;
  createdAt: Date;
};

export type OrderItem = {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  note: string | null;
};

export type CreateOrderDto = {
  branchId: string;
  shiftId?: string;
  cashBoxId?: string;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    note?: string;
  }>;
  total: number;
  discountAmount?: number;
  paymentMethod: PaymentMethod;
  orderType: OrderType;
  orderNote?: string;
  orderOwnerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  captainName?: string;
  collectionStatus?: 'PENDING_APPROVAL' | 'UNCOLLECTED' | 'APPROVED';
};

// ---------- RecipeComponent - مكون الوصفة ----------
export type RecipeComponent = {
  id: string;
  recipeVersionId: string;
  stockItemId: string;
  unitId: string;
  quantity: number;
  wastePercent: number;
  costAmount: number;
};

export type CreateRecipeComponentDto = {
  stockItemId: string;
  unitId: string;
  quantity: number;
  wastePercent?: number;
};