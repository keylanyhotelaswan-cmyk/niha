import { useEffect, useState } from 'react';
export function useDesktopVersion() {
    const [version, setVersion] = useState(null);
    useEffect(() => {
        const api = window.electronAPI;
        if (!api?.getAppVersion)
            return undefined;
        let cancelled = false;
        api.getAppVersion().then((value) => {
            if (!cancelled)
                setVersion(value);
        }).catch(() => { });
        return () => {
            cancelled = true;
        };
    }, []);
    return version;
}
