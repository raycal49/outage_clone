import { useCallback, useEffect, useState } from 'react';
import type { OutageFeature } from '@/lib/outages';

export type LngLat = { lng: number; lat: number };

export type OutageSelection = {
    selected: OutageFeature | null;
    /** Where to anchor the popup. Null exactly when nothing is selected. */
    lngLat: LngLat | null;
    select: (feature: OutageFeature, at: LngLat) => void;
    close: () => void;
};

/**
 * Which outage the popup is showing, and where.
 *
 * Owns the Escape binding, since dismissing on Escape is part of what it means
 * for the selection to be a dialog rather than just a piece of state.
 */
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

    // Escape closes the popup, matching the dialog convention.
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
