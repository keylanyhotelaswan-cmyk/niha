import { useCallback, useEffect, useState } from 'react';
import { API_BASE } from '../../lib/api-client.js';
import { ALL_CATEGORIES, DEFAULT_PAYMENT_METHODS } from './constants.js';
export function usePosCatalog(branchId, accessToken) {
    const [categories, setCategories] = useState([]);
    const [products, setProducts] = useState([]);
    const [paymentMethods, setPaymentMethods] = useState(DEFAULT_PAYMENT_METHODS);
    const [activeCategory, setActiveCategory] = useState(ALL_CATEGORIES);
    const authHeaders = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
    };
    const load = useCallback(async () => {
        if (!branchId || !accessToken)
            return;
        try {
            const [catRes, prodRes, pmRes] = await Promise.all([
                fetch(`${API_BASE}/product-categories?branchId=${branchId}`, { headers: authHeaders }),
                fetch(`${API_BASE}/products?branchId=${branchId}`, { headers: authHeaders }),
                fetch(`${API_BASE}/payment-methods?branchId=${branchId}`, { headers: authHeaders }),
            ]);
            if (catRes.ok) {
                const data = await catRes.json();
                setCategories(data);
                setActiveCategory((current) => {
                    if (current === ALL_CATEGORIES)
                        return current;
                    if (!data.length)
                        return ALL_CATEGORIES;
                    return data.some((c) => c.id === current) ? current : ALL_CATEGORIES;
                });
            }
            if (prodRes.ok)
                setProducts(await prodRes.json());
            if (pmRes.ok) {
                const data = await pmRes.json();
                if (data.length) {
                    setPaymentMethods(data.map((pm) => ({
                        id: pm.code.toLowerCase(),
                        label: pm.name,
                        code: pm.code,
                    })));
                }
            }
        }
        catch {
            /* ignore */
        }
    }, [branchId, accessToken]);
    useEffect(() => {
        setActiveCategory(ALL_CATEGORIES);
        load();
    }, [branchId, load]);
    return {
        categories,
        products,
        paymentMethods,
        activeCategory,
        setActiveCategory,
        reload: load,
    };
}
