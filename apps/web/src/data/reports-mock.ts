export type ReportGroup = 'operations' | 'treasury' | 'inventory' | 'setup';

export const reportKpis = {
  operations: [
    { label: 'مبيعات اليوم', value: 12840, note: '47 فاتورة مغلقة' },
    { label: 'متوسط الفاتورة', value: 273, note: 'على مستوى الكاشيرين' },
    { label: 'طلبات معلقة', value: 2, note: 'تحتاج استكمال أو إلغاء' },
  ],
  treasury: [
    { label: 'تحصيل نقدي', value: 6820, note: 'من الخزنة الحالية' },
    { label: 'سحوبات ومصروفات', value: 320, note: 'حركات خارجة مسجلة' },
    { label: 'فرق العهدة', value: 0, note: 'حتى آخر جرد فعلي' },
  ],
  inventory: [
    { label: 'خامات حرجة', value: 3, note: 'تحت الحد الأدنى' },
    { label: 'هالك اليوم', value: 185, note: 'قيمة تقديرية' },
    { label: 'تكلفة استهلاك', value: 4210, note: 'حسب الوصفات الحالية' },
  ],
  setup: [
    { label: 'إجمالي التأسيس', value: 418000, note: 'من البنود المسجلة' },
    { label: 'المسدّد', value: 309000, note: 'دفعات فعلية' },
    { label: 'المتبقي', value: 109000, note: 'التزامات حالية' },
  ],
} as const;

export const salesByCashier = [
  { cashier: 'أحمد جمال', invoices: 18, total: 4860 },
  { cashier: 'سارة محمد', invoices: 16, total: 4390 },
  { cashier: 'محمود رضا', invoices: 13, total: 3590 },
];

export const topSellingItems = [
  { name: 'ساندوتش شاورما', quantity: 23, revenue: 2185 },
  { name: 'قهوة أمريكانو', quantity: 19, revenue: 855 },
  { name: 'كرواسون زبدة', quantity: 14, revenue: 588 },
];

export const setupByCategory = [
  { category: 'التشطيبات', contracted: 145000, paid: 100000 },
  { category: 'معدات المطبخ', contracted: 182000, paid: 182000 },
  { category: 'أجهزة الكاشير والطباعة', contracted: 46000, paid: 18000 },
  { category: 'كهرباء وسباكة وغاز', contracted: 28000, paid: 0 },
  { category: 'رخص وتأمينات', contracted: 17000, paid: 9000 },
];