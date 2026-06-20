export const ingredients = [
    { id: 'i1', name: 'صدور دجاج', category: 'بروتين', unit: 'كجم', onHand: 22.5, reorderPoint: 15, avgCost: 180, status: 'healthy' },
    { id: 'i2', name: 'خبز بريوش', category: 'مخبوزات', unit: 'قطعة', onHand: 38, reorderPoint: 40, avgCost: 6, status: 'low' },
    { id: 'i3', name: 'جبنة شيدر', category: 'ألبان', unit: 'كجم', onHand: 4.2, reorderPoint: 6, avgCost: 210, status: 'critical' },
    { id: 'i4', name: 'صوص خاص', category: 'إضافات', unit: 'لتر', onHand: 8.5, reorderPoint: 5, avgCost: 65, status: 'healthy' },
    { id: 'i5', name: 'حبوب قهوة', category: 'مشروبات', unit: 'كجم', onHand: 7.4, reorderPoint: 4, avgCost: 320, status: 'healthy' },
];
export const stockMovements = [
    { id: 'm1', ingredientId: 'i1', type: 'purchase_receipt', quantity: 10, occurredAt: '2026-05-22 09:15', reference: 'GRN-22051' },
    { id: 'm2', ingredientId: 'i1', type: 'sales_consumption', quantity: -3.8, occurredAt: '2026-05-23 12:40', reference: 'POS-7812' },
    { id: 'm3', ingredientId: 'i2', type: 'sales_consumption', quantity: -26, occurredAt: '2026-05-23 13:05', reference: 'POS-7819' },
    { id: 'm4', ingredientId: 'i3', type: 'waste', quantity: -0.4, occurredAt: '2026-05-23 11:10', reference: 'WST-104' },
    { id: 'm5', ingredientId: 'i2', type: 'adjustment', quantity: 12, occurredAt: '2026-05-23 10:30', reference: 'ADJ-55' },
];
export const recipeVersions = [
    {
        id: 'r1',
        productName: 'ساندوتش شاورما',
        version: 'REV-3',
        yieldText: '1 ساندوتش',
        wastePercent: 4,
        totalCost: 41,
        components: [
            { ingredientName: 'صدور دجاج', quantityText: '0.18 كجم', cost: 32.4 },
            { ingredientName: 'خبز بريوش', quantityText: '1 قطعة', cost: 6 },
            { ingredientName: 'صوص خاص', quantityText: '0.04 لتر', cost: 2.6 },
        ],
    },
    {
        id: 'r2',
        productName: 'قهوة أمريكانو',
        version: 'REV-1',
        yieldText: '1 كوب',
        wastePercent: 2,
        totalCost: 12,
        components: [
            { ingredientName: 'حبوب قهوة', quantityText: '0.028 كجم', cost: 8.96 },
            { ingredientName: 'مياه معالجة', quantityText: '0.25 لتر', cost: 0.8 },
            { ingredientName: 'كوب تقديم', quantityText: '1 قطعة', cost: 2.24 },
        ],
    },
];
