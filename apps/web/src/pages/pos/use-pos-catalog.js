import { useEffect, useState } from 'react';
import { usePosCatalog as usePosCatalogQuery } from '../../lib/hooks.js';
import { isPaidSauceSku } from '../../lib/pos-order-sauces.js';
import { ALL_CATEGORIES, DEFAULT_PAYMENT_METHODS } from './constants.js';
import { readPosBranchId } from '../../lib/pos-store.js';
export function usePosCatalog(branchId, accessToken, opts) {
    const catalogBranchId = branchId || readPosBranchId();
    const { data, isPending, isFetching, refetch } = usePosCatalogQuery(accessToken ? catalogBranchId : undefined, !(opts?.skipFetch));
    const [activeCategory, setActiveCategory] = useState(ALL_CATEGORIES);
    useEffect(() => {
        setActiveCategory(ALL_CATEGORIES);
    }, [catalogBranchId]);
    const paymentMethods = data?.paymentMethods?.length
        ? data.paymentMethods.map((pm) => ({
            id: pm.code.toLowerCase(),
            label: pm.name,
            code: pm.code,
        }))
        : DEFAULT_PAYMENT_METHODS;
    const sauces = (data?.sauces ?? [])
        .filter((s) => s.isAvailable !== false)
        .map((s) => ({ id: s.id, name: s.name }));
    const products = (data?.products ?? []);
    const paidSauceProductIds = products
        .filter((p) => isPaidSauceSku(p.sku))
        .map((p) => p.id);
    return {
        categories: (data?.categories ?? []),
        products,
        sauces,
        paidSauceProductIds,
        customLineProductId: data?.customLineProduct?.id ?? null,
        paymentMethods,
        activeCategory,
        setActiveCategory,
        catalogPending: isPending && !data,
        catalogFetching: isFetching,
        reload: () => refetch(),
    };
}
