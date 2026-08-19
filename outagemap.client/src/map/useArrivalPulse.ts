import { useEffect } from 'react';
import type { RefObject } from 'react';
import type { MapRef } from 'react-map-gl/mapbox';
import type { OutageCollection } from '@/lib/outages';
import { ARRIVAL_MS } from '@/hooks/useOutageFeed';
import { ARRIVAL_RADIUS_FROM, ARRIVAL_RADIUS_TO } from './layers';

export function useArrivalPulse(mapRef: RefObject<MapRef | null>, arrivals: OutageCollection | null): void {
    useEffect(() => {
        if (!arrivals) return;

        const map = mapRef.current?.getMap();
        if (!map) return;

        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduceMotion) return;

        const start = performance.now();
        let frame = requestAnimationFrame(function step(timestamp: number) {
            const progress = Math.min(1, (timestamp - start) / ARRIVAL_MS);
            const eased = 1 - Math.pow(1 - progress, 3);

            if (map.getLayer("outage-arrivals")) {
                map.setPaintProperty(
                    "outage-arrivals",
                    "circle-radius",
                    ARRIVAL_RADIUS_FROM + eased * (ARRIVAL_RADIUS_TO - ARRIVAL_RADIUS_FROM)
                );
                map.setPaintProperty("outage-arrivals", "circle-stroke-opacity", 0.9 * (1 - eased));
            }

            if (progress < 1) frame = requestAnimationFrame(step);
        });

        return () => cancelAnimationFrame(frame);
    }, [arrivals, mapRef]);
}
