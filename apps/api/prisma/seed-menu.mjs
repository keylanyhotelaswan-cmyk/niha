/**
 * منيو Niha Yam — فئات وأصناف للبيع (بدون خامات/وصفات).
 * الخامات تُضاف لاحقاً من المخزون والوصفات.
 */
export const nihaYamMenu = [
  {
    name: 'دامبلينج ووجبات سريعة',
    products: [
      { sku: 'NY-DMP-CHKN', name: 'دامبلينج فراخ (8 قطع)', salePrice: 99 },
      { sku: 'NY-DMP-MEAT', name: 'دامبلينج لحمة (8 قطع)', salePrice: 111 },
      { sku: 'NY-KOR-DOG', name: 'كوريان دوج', salePrice: 70 },
      { sku: 'NY-FRIES', name: 'بطاطس', salePrice: 60 },
    ],
  },
  {
    name: 'سوشي ترندي',
    products: [
      { sku: 'NY-SUS-TEMAKI', name: 'تيماكي', salePrice: 35 },
      { sku: 'NY-SUS-NYAM', name: 'نيها يم', salePrice: 35 },
      { sku: 'NY-SUS-OSAKA', name: 'اوساكا (سوشي ساندوتش)', salePrice: 80 },
      { sku: 'NY-SUS-HABRA', name: 'هبره سوشي (وجبة سوشي)', salePrice: 120 },
    ],
  },
  {
    name: 'اورا رول',
    products: [
      { sku: 'NY-URA-CAL', name: 'كاليفورنيا', salePrice: 20 },
      { sku: 'NY-URA-SHRTP', name: 'شرمب تمبورا', salePrice: 25 },
      { sku: 'NY-URA-PHIL', name: 'فلادلفيا', salePrice: 25 },
      { sku: 'NY-URA-KOKO', name: 'كوكو فرايد', salePrice: 20 },
    ],
  },
  {
    name: 'ماكي رول',
    products: [
      { sku: 'NY-MAK-KANI', name: 'كاني ماكي', salePrice: 20 },
      { sku: 'NY-MAK-EBI', name: 'ايبي ماكي', salePrice: 25 },
      { sku: 'NY-MAK-SAKA', name: 'ساكا ماكي', salePrice: 25 },
      { sku: 'NY-MAK-BAK', name: 'بك بك ماكي فرايد', salePrice: 20 },
    ],
  },
  {
    name: 'صوصات مجانية',
    products: [
      { sku: 'NY-FS-SOY', name: 'صويا صوص', salePrice: 0 },
      { sku: 'NY-FS-TERI', name: 'ترياكي صوص', salePrice: 0 },
      { sku: 'NY-FS-SWCH', name: 'سويت تشيلي', salePrice: 0 },
      { sku: 'NY-FS-MAYO', name: 'مايونيز', salePrice: 0 },
      { sku: 'NY-FS-HMAYO', name: 'هوت مايو', salePrice: 0 },
      { sku: 'NY-FS-BBQ', name: 'باربيكيو', salePrice: 0 },
      { sku: 'NY-FS-RANCH', name: 'رانش', salePrice: 0 },
      { sku: 'NY-FS-CHIO', name: 'تشيلي أويل', salePrice: 0 },
    ],
  },
  {
    name: 'صوصات إضافية',
    products: [
      { sku: 'NY-SAU-SOY', name: 'صويا صوص', salePrice: 20 },
      { sku: 'NY-SAU-TERI', name: 'ترياكي صوص', salePrice: 20 },
      { sku: 'NY-SAU-SWCH', name: 'سويت تشيلي', salePrice: 20 },
      { sku: 'NY-SAU-MAYO', name: 'مايونيز', salePrice: 20 },
      { sku: 'NY-SAU-HMAYO', name: 'هوت مايو', salePrice: 20 },
      { sku: 'NY-SAU-BBQ', name: 'باربيكيو', salePrice: 20 },
      { sku: 'NY-SAU-CHDR', name: 'شيدر', salePrice: 20 },
      { sku: 'NY-SAU-RANCH', name: 'رانش', salePrice: 20 },
      { sku: 'NY-SAU-CHIO', name: 'تشيلي أويل', salePrice: 20 },
    ],
  },
  {
    name: 'كوريان نودلز',
    products: [
      { sku: 'NY-KN-CHEESY', name: 'تشيزي بوم', salePrice: 95 },
      { sku: 'NY-KN-DOGZ', name: 'دوجزيلا', salePrice: 100 },
      { sku: 'NY-KN-BANG', name: 'بانج بانج تشيكن', salePrice: 115 },
      { sku: 'NY-KN-DRAGON', name: 'دراجون بيف', salePrice: 120 },
      { sku: 'NY-KN-SAMURAI', name: 'ساموراي شريمب', salePrice: 140 },
    ],
  },
  {
    name: 'رامن',
    products: [
      { sku: 'NY-RAM-VOLC', name: 'فولكانو دوج', salePrice: 105 },
      { sku: 'NY-RAM-FIRE', name: 'فاير تشيكن', salePrice: 125 },
      { sku: 'NY-RAM-BEEF', name: 'بيف بوم', salePrice: 135 },
      { sku: 'NY-RAM-LAVA', name: 'لافا شريمب', salePrice: 155 },
    ],
  },
  {
    name: 'جلاس نودلز',
    products: [
      { sku: 'NY-GL-GOLD', name: 'جولدن تشيز', salePrice: 120 },
      { sku: 'NY-GL-EMPIRE', name: 'إمباير دوج', salePrice: 125 },
      { sku: 'NY-GL-BLAZE', name: 'بليز تشيكن', salePrice: 140 },
      { sku: 'NY-GL-KING', name: 'كينج بيف', salePrice: 145 },
      { sku: 'NY-GL-SHRIMP', name: 'شريمب يم', salePrice: 165 },
    ],
  },
  {
    name: 'رايز نودلز',
    products: [
      { sku: 'NY-RN-ULTRA', name: 'الترا تشيز', salePrice: 130 },
      { sku: 'NY-RN-ROYAL', name: 'رويال دوج', salePrice: 135 },
      { sku: 'NY-RN-MOOD', name: 'تشيكن مود', salePrice: 145 },
      { sku: 'NY-RN-RUSH', name: 'بيف راش', salePrice: 155 },
      { sku: 'NY-RN-OCEAN', name: 'أوشن شريمب', salePrice: 170 },
    ],
  },
];

export async function seedNihaYamMenu(prisma, branchId) {
  let categories = 0;
  let products = 0;

  for (const category of nihaYamMenu) {
    const row = await prisma.productCategory.upsert({
      where: { branchId_name: { branchId, name: category.name } },
      update: {},
      create: { branchId, name: category.name },
    });
    categories += 1;

    for (const product of category.products) {
      await prisma.product.upsert({
        where: { branchId_sku: { branchId, sku: product.sku } },
        update: {
          name: product.name,
          salePrice: product.salePrice,
          categoryId: row.id,
          isAvailable: true,
        },
        create: {
          branchId,
          categoryId: row.id,
          name: product.name,
          sku: product.sku,
          salePrice: product.salePrice,
          estimatedCost: null,
          isAvailable: true,
        },
      });
      products += 1;
    }
  }

  return { categories, products };
}
