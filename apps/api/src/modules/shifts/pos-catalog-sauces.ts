type CatalogCategory = { id: string; name: string };
type CatalogProduct = {
  id: string;
  categoryId: string;
  sku?: string | null;
  salePrice: number;
  name: string;
  isAvailable: boolean;
};

export function categoryNameMap(categories: CatalogCategory[]) {
  return new Map(categories.map((c) => [c.id, c.name]));
}

/** علب صوص للبيع (صوصات إضافية / NY-SAU-*) */
export function isPaidSauceProduct(
  product: Pick<CatalogProduct, 'categoryId' | 'sku'>,
  categories: Map<string, string>,
) {
  if (product.sku?.startsWith('NY-SAU-')) return true;
  const categoryName = categories.get(product.categoryId) ?? '';
  return categoryName.includes('إضاف');
}

/** صوصات مجانية — إضافة على الصنف فقط (لا تظهر كسطر منفصل في المنيو) */
export function isFreeSauceProduct(
  product: Pick<CatalogProduct, 'categoryId' | 'sku' | 'salePrice'>,
  categories: Map<string, string>,
) {
  if (product.sku?.startsWith('NY-FS-')) return true;
  const categoryName = categories.get(product.categoryId) ?? '';
  if (categoryName.includes('مجان')) return true;
  if (isPaidSauceProduct(product, categories)) return false;
  return categoryName.includes('صوص') && product.salePrice === 0;
}

export function splitPosCatalogProducts(
  products: CatalogProduct[],
  categories: CatalogCategory[],
) {
  const categoryNames = categoryNameMap(categories);
  const freeSauceProducts = products.filter((p) => isFreeSauceProduct(p, categoryNames));
  const menuProducts = products.filter((p) => !isFreeSauceProduct(p, categoryNames));
  const sauces = freeSauceProducts.map((p) => ({
    id: p.id,
    name: p.name,
    isAvailable: p.isAvailable,
  }));
  return { menuProducts, sauces };
}
