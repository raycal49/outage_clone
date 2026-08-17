import type { Feature, FeatureCollection, Point } from 'geojson';

/**
 * The properties the server attaches to every outage feature.
 * Mirrors OutageMap.Server/Models/OutageEntityToGeojson.cs.
 */
export type OutageProperties = {
    id?: number;
    startTime?: number;
    etrTime?: number | null;
    numPeople?: number;
    status?: string;
    cause?: string | null;
    city?: string | null;
    county?: string | null;
    serviceArea?: string | null;
    zipCode?: string | null;
};

export type OutageFeature = Feature<Point, OutageProperties>;
export type OutageCollection = FeatureCollection<Point, OutageProperties>;

/** Whether the SignalR hub is currently delivering updates. */
export type ConnectionState = 'connecting' | 'live' | 'reconnecting' | 'offline';

/** The set of source ids present in a payload, used to spot new arrivals. */
export function collectIds(fc: OutageCollection): Set<number> {
    const ids = new Set<number>();

    for (const feature of fc.features) {
        const id = feature.properties?.id;
        if (typeof id === 'number') ids.add(id);
    }

    return ids;
}

/**
 * Features whose id was absent from the previous payload.
 *
 * The server emits its identifier as properties.id rather than as a top-level
 * GeoJSON id, so the comparison has to read through properties.
 */
export function featuresWithNewIds(fc: OutageCollection, previousIds: Set<number>): OutageFeature[] {
    return fc.features.filter(feature => {
        const id = feature.properties?.id;
        return typeof id === 'number' && !previousIds.has(id);
    });
}

/** Compact elapsed time for the connection pill: "8s", "4m", "1h 12m". */
export function formatAge(elapsedMs: number): string {
    const seconds = Math.max(0, Math.floor(elapsedMs / 1000));

    if (seconds < 60) return `${seconds}s`;

    const minutes = Math.floor(seconds / 60);

    if (minutes < 60) return `${minutes}m`;

    const hours = Math.floor(minutes / 60);

    return `${hours}h ${minutes % 60}m`;
}
