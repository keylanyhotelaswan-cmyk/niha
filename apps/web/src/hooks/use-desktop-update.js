import { useEffect, useState } from 'react';
export function useDesktopUpdate() {
    const [update, setUpdate] = useState(null);
    useEffect(() => {
        const api = window.electronAPI;
        if (!api?.onUpdateStatus)
            return undefined;
        return api.onUpdateStatus((payload) => {
            setUpdate(payload);
        });
    }, []);
    const label = update?.status === 'checking'
        ? 'جاري التحقق من التحديثات'
        : update?.status === 'available'
            ? `تحديث ${update.detail ?? ''}`.trim()
            : update?.status === 'downloading'
                ? `تنزيل التحديث ${update.detail ?? 0}%`
                : update?.status === 'ready'
                    ? `تحديث ${update.detail ?? ''} جاهز`.trim()
                    : null;
    return { update, label };
}
