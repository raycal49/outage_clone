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

/**
 * Status colours for the point layer, legend and popup chip.
 *
 * These are the four statuses the CenterPoint feed actually publishes. Anything
 * else falls through to UNKNOWN_STATUS_COLOR - a neutral grey, deliberately not
 * green, so an unrecognised status reads as "unclassified" rather than
 * impersonating a healthy state.
 *
 * These five were checked for colour-vision separation rather than chosen by eye.
 * Worst adjacent pair is 10.4 dE under protanopia and 16.3 for normal vision,
 * both above floor. An earlier violet for "Further Assessment Needed" sat 1.3 dE
 * from Crew Assessing under deuteranopia - indistinguishable - and was replaced.
 * The amber and cyan sit outside the ideal lightness band; accepted, because the
 * amber is the pre-existing feed colour and every swatch ships with a text label.
 */
export const STATUS_COLORS: Record<string, string> = {
    'Pending Assessment': '#f59e0b',
    'Crew Assessing': '#3b82f6',
    'Planned Outage': '#ef4444',
    'Further Assessment Needed': '#22d3ee'
};

export const UNKNOWN_STATUS_COLOR = '#64748b';

/** Order used wherever statuses are listed, roughly worst-known-state first. */
export const STATUS_ORDER = [
    'Pending Assessment',
    'Further Assessment Needed',
    'Crew Assessing',
    'Planned Outage'
];

export function statusColor(status: string | undefined): string {
    return (status && STATUS_COLORS[status]) || UNKNOWN_STATUS_COLOR;
}

/** Label used when the feed sends a feature with no status at all. */
export const UNCLASSIFIED_STATUS = 'Unclassified';

/** Hours covered by the onset chart in the summary panel. */
export const TREND_HOURS = 6;

export type StatusCount = { status: string; count: number; color: string };
export type TrendBucket = { label: string; count: number };

export type OutageSummary = {
    total: number;
    customers: number;
    largest: number;
    byStatus: StatusCount[];
    trend: TrendBucket[];
};

/**
 * Everything the summary panel shows, derived from the payload already in state.
 *
 * The trend counts how many of the *currently active* outages began in each of
 * the last six hours. It is an onset profile, not a history: outages that have
 * since been restored are not in the payload and so cannot appear here.
 */
export function summariseOutages(fc: OutageCollection | null, now: number = Date.now()): OutageSummary {
    const counts = new Map<string, number>();
    const features = fc?.features ?? [];

    let customers = 0;
    let largest = 0;

    const trend: TrendBucket[] = [];
    for (let hoursBack = TREND_HOURS - 1; hoursBack >= 0; hoursBack--) {
        trend.push({ label: hoursBack === 0 ? 'now' : `-${hoursBack}h`, count: 0 });
    }

    for (const feature of features) {
        const properties = feature.properties ?? {};
        const status = properties.status ?? UNCLASSIFIED_STATUS;

        counts.set(status, (counts.get(status) ?? 0) + 1);

        const affected = typeof properties.numPeople === 'number' ? properties.numPeople : 0;
        customers += affected;
        if (affected > largest) largest = affected;

        if (typeof properties.startTime === 'number') {
            const hoursAgo = (now - properties.startTime) / 3_600_000;

            if (hoursAgo >= 0 && hoursAgo < TREND_HOURS)
                trend[TREND_HOURS - 1 - Math.floor(hoursAgo)].count += 1;
        }
    }

    // Known statuses first so rows keep a stable order as counts change, then
    // anything unexpected the feed sent, so the rows always sum to the total.
    const byStatus: StatusCount[] = STATUS_ORDER.map(status => ({
        status,
        count: counts.get(status) ?? 0,
        color: statusColor(status)
    }));

    for (const [status, count] of counts) {
        if (!STATUS_ORDER.includes(status))
            byStatus.push({ status, count, color: UNKNOWN_STATUS_COLOR });
    }

    return { total: features.length, customers, largest, byStatus, trend };
}
