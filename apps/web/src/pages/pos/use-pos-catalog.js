import { useEffect, useState } from 'react';
import { usePosCatalog as usePosCatalogQuery } from '../../lib/hooks.js';
import { ALL_CATEGORIES, DEFAULT_PAYMENT_METHODS } from './constants.js';
import { readPosBranchId } from '../../lib/pos-store.js';
export function usePosCatalog(branchId, accessToken) {
    const catalogBranchId = branchId || readPosBranchId();
    const { data, isPending, isFetching, refetch } = usePosCatalogQuery(accessToken ? catalogBranchId : undefined);
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
    return {
        categories: (data?.categories ?? []),
        products: (data?.products ?? []),
        sauces,
        paymentMethods,
        activeCategory,
        setActiveCategory,
        catalogPending: isPending && !data,
        catalogFetching: isFetching,
        reload: () => refetch(),
    };
}
