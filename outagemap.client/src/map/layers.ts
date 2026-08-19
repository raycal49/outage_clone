import type { LayerProps } from 'react-map-gl/mapbox';
import type { ExpressionSpecification } from 'mapbox-gl';
import { STATUS_COLORS, UNKNOWN_STATUS_COLOR } from '@/lib/outages';

export const ARRIVAL_RADIUS_FROM = 6;
export const ARRIVAL_RADIUS_TO = 40;

export const CLUSTER_MAX_ZOOM = 12;
export const CLUSTER_RADIUS = 50;
export const CLUSTER_MIN_POINTS = 3;

const POINT_RADIUS_MIN = 5;
const POINT_RADIUS_MAX = 13;
const HALO_RADIUS_MIN = 12;
const HALO_RADIUS_MAX = 32;

const CUSTOMERS_MIN = 1;
const CUSTOMERS_MAX = 80;

const CUSTOMER_SCALE_MIN = Math.sqrt(CUSTOMERS_MIN);
const CUSTOMER_SCALE_MAX = Math.sqrt(CUSTOMERS_MAX);

function scaleByCustomers(minRadius: number, maxRadius: number): ExpressionSpecification {
    return [
        "interpolate",
        ["linear"],
        ["sqrt", ["coalesce", ["get", "numPeople"], CUSTOMERS_MIN]],
        CUSTOMER_SCALE_MIN, minRadius,
        CUSTOMER_SCALE_MAX, maxRadius
    ];
}

const STATUS_COLOR_EXPRESSION: ExpressionSpecification = [
    "match",
    ["get", "status"],
    "Pending Assessment", STATUS_COLORS["Pending Assessment"],
    "Crew Assessing", STATUS_COLORS["Crew Assessing"],
    "Planned Outage", STATUS_COLORS["Planned Outage"],
    "Further Assessment Needed", STATUS_COLORS["Further Assessment Needed"],
    UNKNOWN_STATUS_COLOR
];

export const clusterLayer = {
    id: "outage-clusters",
    type: "circle",
    filter: ["has", "point_count"],
    paint: {
        "circle-emissive-strength": 1,
        "circle-color": "rgba(15, 14, 20, 0.86)",
        "circle-stroke-width": 2,
        "circle-stroke-color": "#f1f5f9",
        "circle-radius": ["interpolate", ["linear"], ["get", "point_count"], 3, 16, 10, 22, 30, 30],
        "circle-radius-transition": { duration: 300 }
    }
} satisfies LayerProps;

export const clusterCountLayer = {
    id: "outage-cluster-count",
    type: "symbol",
    filter: ["has", "point_count"],
    layout: {
        "text-field": ["get", "point_count_abbreviated"],
        "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
        "text-size": 12
    },
    paint: { "text-color": "#f1f5f9" }
} satisfies LayerProps;

export const outageHaloLayer = {
    id: "outage-halos",
    type: "circle",
    filter: ["!", ["has", "point_count"]],
    paint: {
        "circle-emissive-strength": 1,
        "circle-radius": scaleByCustomers(HALO_RADIUS_MIN, HALO_RADIUS_MAX),
        "circle-color": STATUS_COLOR_EXPRESSION,
        "circle-opacity": 0.3,
        "circle-blur": 1
    }
} satisfies LayerProps;

export const outageLayer = {
    id: "outage-points",
    type: "circle",
    filter: ["!", ["has", "point_count"]],
    paint: {
        "circle-emissive-strength": 1,
        "circle-radius": scaleByCustomers(POINT_RADIUS_MIN, POINT_RADIUS_MAX),
        "circle-opacity": 0.95,
        "circle-stroke-width": 1.5,
        "circle-stroke-color": "rgba(0, 0, 0, 0.7)",
        "circle-color": STATUS_COLOR_EXPRESSION
    }
} satisfies LayerProps;

export const arrivalLayer = {
    id: "outage-arrivals",
    type: "circle",
    paint: {
        "circle-emissive-strength": 1,
        "circle-radius": ARRIVAL_RADIUS_FROM,
        "circle-opacity": 0,
        "circle-stroke-width": 2,
        "circle-stroke-opacity": 0.9,

        "circle-stroke-color": STATUS_COLOR_EXPRESSION
    }
} satisfies LayerProps;
