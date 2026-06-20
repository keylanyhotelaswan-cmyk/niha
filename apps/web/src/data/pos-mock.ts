export type MenuCategory = {
  id: string;
  name: string;
};

export type MenuProduct = {
  id: string;
  categoryId: string;
  name: string;
  price: number;
  available: boolean;
  estimatedCost: number;
};

export type SuspendedOrder = {
  id: string;
  code: string;
  orderType: 'eat-in' | 'takeaway';
  total: number;
  itemsCount: number;
};

export const menuCategories: MenuCategory[] = [
  { id: 'sandwiches', name: 'ساندوتشات' },
  { id: 'bakery', name: 'مخبوزات' },
  { id: 'drinks', name: 'مشروبات' },
  { id: 'addons', name: 'إضافات' },
];

export const menuProducts: MenuProduct[] = [
  { id: 'p1', categoryId: 'sandwiches', name: 'ساندوتش شاورما', price: 95, estimatedCost: 41, available: true },
  { id: 'p2', categoryId: 'sandwiches', name: 'ساندوتش برجر لحم', price: 110, estimatedCost: 52, available: true },
  { id: 'p3', categoryId: 'bakery', name: 'كرواسون زبدة', price: 42, estimatedCost: 15, available: true },
  { id: 'p4', categoryId: 'bakery', name: 'باتيه جبنة', price: 38, estimatedCost: 13, available: false },
  { id: 'p5', categoryId: 'drinks', name: 'قهوة أمريكانو', price: 45, estimatedCost: 12, available: true },
  { id: 'p6', categoryId: 'drinks', name: 'عصير برتقال', price: 50, estimatedCost: 18, available: true },
  { id: 'p7', categoryId: 'addons', name: 'جبنة إضافية', price: 12, estimatedCost: 5, available: true },
  { id: 'p8', categoryId: 'addons', name: 'صوص خاص', price: 8, estimatedCost: 2, available: true },
];

export const suspendedOrders: SuspendedOrder[] = [
  { id: 'h1', code: 'HLD-1042', orderType: 'takeaway', total: 178, itemsCount: 3 },
  { id: 'h2', code: 'HLD-1043', orderType: 'eat-in', total: 224, itemsCount: 4 },
];

export const paymentMethods = [
  { id: 'cash', label: 'نقدي' },
  { id: 'card', label: 'بطاقة' },
  { id: 'wallet', label: 'محفظة' },
  { id: 'mixed', label: 'مختلط' },
] as const;