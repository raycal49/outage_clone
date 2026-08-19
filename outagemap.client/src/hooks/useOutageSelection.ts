import { useCallback, useEffect, useState } from 'react';
import type { OutageFeature } from '@/lib/outages';

export type LngLat = { lng: number; lat: number };

export type OutageSelection = {
    selected: OutageFeature | null;
    lngLat: LngLat | null;
    select: (feature: OutageFeature, at: LngLat) => void;
    close: () => void;
};

export function useOutageSelection(): OutageSelection {
    const [selected, setSelected] = useState<OutageFeature | null>(null);
    const [lngLat, setLngLat] = useState<LngLat | null>(null);

    const select = useCallback((feature: OutageFeature, at: LngLat) => {
        setSelected(feature);
        setLngLat(at);
    }, []);

    const close = useCallback(() => {
        setSelected(null);
        setLngLat(null);
    }, []);

    useEffect(() => {
        if (!selected) return;

        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") close();
        };

        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [selected, close]);

    return { selected, lngLat, select, close };
}
