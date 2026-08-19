import { useEffect, useRef, useState } from 'react';
import { collectIds, featuresWithNewIds, type OutageCollection } from '@/lib/outages';
import { subscribeToOutageHub, type ConnectionState } from '@/lib/outageHub';

/**
 * How long a newly arrived outage keeps its bloom ring.
 *
 * Owned here rather than alongside the animation because this is the timer that
 * decides how long `arrivals` stays populated - the animation has to match the
 * state, not the other way round.
 */
export const ARRIVAL_MS = 1600;

export type OutageFeed = {
    outages: OutageCollection | null;
    /** Only the features whose id was absent from the previous payload. */
    arrivals: OutageCollection | null;
    connectionState: ConnectionState;
    lastUpdatedAt: number | null;
};

/**
 * The live outage payload, refreshed whenever the hub announces a change.
 *
 * Knows nothing about mapbox: it fetches, diffs against the previous payload to
 * spot arrivals, and reports connection health.
 */
export function useOutageFeed(): OutageFeed {
    const [outages, setOutages] = useState<OutageCollection | null>(null);
    const [arrivals, setArrivals] = useState<OutageCollection | null>(null);
    const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');
    const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);

    // Ids from the previous payload. Null until the first load completes, which is
    // how the initial fetch avoids blooming every outage at once.
    const previousIdsRef = useRef<Set<number> | null>(null);
    const arrivalTimerRef = useRef<number | null>(null);

    useEffect(() => {
        const refreshOutages = async () => {
            const res = await fetch("/OutageMap/OutageData");

            if (!res.ok)
                throw new Error(`OutageData failed (${res.status})`);

            const fc: OutageCollection = await res.json();

            const previousIds = previousIdsRef.current;
            previousIdsRef.current = collectIds(fc);

            setOutages(fc);
            setLastUpdatedAt(Date.now());

            if (previousIds === null)
                return;

            const arrived = featuresWithNewIds(fc, previousIds);

            if (arrived.length === 0)
                return;

            setArrivals({ type: "FeatureCollection", features: arrived });

            if (arrivalTimerRef.current !== null)
                window.clearTimeout(arrivalTimerRef.current);

            arrivalTimerRef.current = window.setTimeout(() => setArrivals(null), ARRIVAL_MS);
        };

        refreshOutages().catch(console.error);

        const unsubscribe = subscribeToOutageHub({
            onOutagesChanged: () => refreshOutages().catch(console.error),
            onStateChange: setConnectionState
        });

        return () => {
            if (arrivalTimerRef.current !== null)
                window.clearTimeout(arrivalTimerRef.current);

            unsubscribe();
        };
    }, []);

    return { outages, arrivals, connectionState, lastUpdatedAt };
}
