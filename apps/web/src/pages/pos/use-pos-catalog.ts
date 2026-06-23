import { useEffect, useState } from 'react';
import { usePosCatalog as usePosCatalogQuery } from '../../lib/hooks.js';
import type { PosSauceOption } from '../../lib/pos-order-sauces.js';
import { isPaidSauceSku } from '../../lib/pos-order-sauces.js';
import { ALL_CATEGORIES, DEFAULT_PAYMENT_METHODS, type PaymentMethodOption } from './constants.js';
import { readPosBranchId } from '../../lib/pos-store.js';

export function usePosCatalog(branchId: string, accessToken: string | null) {
  const catalogBranchId = branchId || readPosBranchId();
  const { data, isPending, isFetching, refetch } = usePosCatalogQuery(
    accessToken ? catalogBranchId : undefined,
  );
  const [activeCategory, setActiveCategory] = useState(ALL_CATEGORIES);

  useEffect(() => {
    setActiveCategory(ALL_CATEGORIES);
  }, [catalogBranchId]);

  const paymentMethods: PaymentMethodOption[] = data?.paymentMethods?.length
    ? data.paymentMethods.map((pm) => ({
        id: pm.code.toLowerCase(),
        label: pm.name,
        code: pm.code,
      }))
    : DEFAULT_PAYMENT_METHODS;

  const sauces: PosSauceOption[] = (data?.sauces ?? [])
    .filter((s) => s.isAvailable !== false)
    .map((s) => ({ id: s.id, name: s.name }));

  type PosCatalogProduct = {
    id: string;
    name: string;
    salePrice: number;
    sku?: string | null;
    isAvailable?: boolean;
  };

  const products = (data?.products ?? []) as PosCatalogProduct[];
  const paidSauceProductIds = products
    .filter((p) => isPaidSauceSku(p.sku))
    .map((p) => p.id);

  return {
    categories: (data?.categories ?? []) as any[],
    products,
    sauces,
    paidSauceProductIds,
    paymentMethods,
    activeCategory,
    setActiveCategory,
    catalogPending: isPending && !data,
    catalogFetching: isFetching,
    reload: () => refetch(),
  };
}
