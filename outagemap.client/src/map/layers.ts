import type { LayerProps } from 'react-map-gl/mapbox';
import type { ExpressionSpecification } from 'mapbox-gl';
import { STATUS_COLORS, UNKNOWN_STATUS_COLOR } from '@/lib/outages';

export const ARRIVAL_RADIUS_FROM = 6;
export const ARRIVAL_RADIUS_TO = 40;

/*
 * Clustering. Merging co-located outages is the only way to stop a large dot
 * swallowing a small one - drawing the small one on top would leave two circles
 * inside each other, which reads as a mistake rather than as data.
 *
 * Tuned for a normal day rather than a storm day. The feed usually carries a few
 * dozen outages, not the hundred-plus of a bad afternoon, so aggressive settings
 * spent continuity for almost no benefit: points regrouped repeatedly while
 * zooming and became hard to follow.
 *
 * A minimum of three keeps pairs as two visible dots, since hiding two outages
 * behind one bubble gains nothing, and the shallower depth resolves everything
 * to individual dots early so zooming settles instead of continuing to
 * rearrange. Those two do all the work: measured against both a 12-outage day
 * and the 102-outage fixture, a normal day draws zero clusters at every radius
 * from 30 to 50.
 *
 * The radius therefore stays at 50. Narrowing it changed nothing on a normal
 * day but gutted a heavy one - at zoom 9 the fixture fell from 16 clusters to
 * 4, which is close to not clustering at all.
 */
export const CLUSTER_MAX_ZOOM = 12;
export const CLUSTER_RADIUS = 50;
export const CLUSTER_MIN_POINTS = 3;

const POINT_RADIUS_MIN = 5;
const POINT_RADIUS_MAX = 13;
const HALO_RADIUS_MIN = 12;
const HALO_RADIUS_MAX = 32;

/*
 * Radius is interpolated against sqrt(numPeople) so a circle's *area*, not its
 * radius, tracks the customer count - scaling radius linearly would badly
 * over-weight large outages.
 *
 * The ceiling is a deliberate clamp, not the observed maximum. It was originally
 * 182, taken from a storm-day fixture, which meant an ordinary day (largest
 * outage around 66 customers) only ever used the bottom half of the scale and
 * every dot came out roughly the same size. Anything past the ceiling simply
 * reads as "very large", which is all the distinction that is needed up there.
 */
const CUSTOMERS_MIN = 1;
const CUSTOMERS_MAX = 80;

/*
 * The interpolation stops have to be given in the same units as its input, and
 * the input is square-rooted - so these are sqrt(customers), not customers.
 * Putting the raw counts in the stops would not error, it would just produce
 * quietly wrong sizes, which is worth a name rather than a bare Math.sqrt call.
 */
const CUSTOMER_SCALE_MIN = Math.sqrt(CUSTOMERS_MIN);
const CUSTOMER_SCALE_MAX = Math.sqrt(CUSTOMERS_MAX);

/*
 * Radius does not vary with zoom. Growing dots as the map zooms in was tried and
 * removed: it worked directly against clustering, which stops at zoom 12, so dots
 * reached their largest exactly where nothing was left to keep them apart, and a
 * big outage began occluding a neighbouring small one again.
 */
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

/*
 * Cluster bubble: dark centre, bright rim. On this near-black basemap a pale
 * translucent fill reads as a smudge, so the separation comes from a hard
 * bright edge - the same halo logic the basemap's own labels use. Kept
 * achromatic on purpose: every violet and magenta candidate collided with the
 * blue "Crew Assessing" status under colour-vision simulation, and a coloured
 * cluster would imply a status that a mixed group does not have.
 */
export const clusterLayer = {
    id: "outage-clusters",
    type: "circle",
    filter: ["has", "point_count"],
    paint: {
        // Mapbox Standard lights the scene in 3D and circle-emissive-strength
        // defaults to 0, so at the night preset these render almost black
        // whatever circle-color says. Symbol layers default to 1, which is why
        // the cluster count stayed legible while the dots did not.
        "circle-emissive-strength": 1,
        "circle-color": "rgba(15, 14, 20, 0.86)",
        "circle-stroke-width": 2,
        "circle-stroke-color": "#f1f5f9",
        // Interpolated rather than stepped: a step expression snaps the bubble
        // between fixed sizes as a cluster gains or loses members while zooming,
        // which is most of what reads as jitter. The transition eases the rest.
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
        // Mapbox Standard lights the scene in 3D and circle-emissive-strength
        // defaults to 0, so at the night preset these render almost black
        // whatever circle-color says. Symbol layers default to 1, which is why
        // the cluster count stayed legible while the dots did not.
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
        // Mapbox Standard lights the scene in 3D and circle-emissive-strength
        // defaults to 0, so at the night preset these render almost black
        // whatever circle-color says. Symbol layers default to 1, which is why
        // the cluster count stayed legible while the dots did not.
        "circle-emissive-strength": 1,
        "circle-radius": scaleByCustomers(POINT_RADIUS_MIN, POINT_RADIUS_MAX),
        "circle-opacity": 0.95,
        "circle-stroke-width": 1.5,
        "circle-stroke-color": "rgba(0, 0, 0, 0.7)",
        "circle-color": STATUS_COLOR_EXPRESSION
    }
} satisfies LayerProps;

// Ring drawn over a newly arrived outage. Starts at the point radius and is
// expanded/faded by the animation effect in useArrivalPulse.
export const arrivalLayer = {
    id: "outage-arrivals",
    type: "circle",
    paint: {
        // Mapbox Standard lights the scene in 3D and circle-emissive-strength
        // defaults to 0, so at the night preset these render almost black
        // whatever circle-color says. Symbol layers default to 1, which is why
        // the cluster count stayed legible while the dots did not.
        "circle-emissive-strength": 1,
        "circle-radius": ARRIVAL_RADIUS_FROM,
        "circle-opacity": 0,
        "circle-stroke-width": 2,
        "circle-stroke-opacity": 0.9,

        "circle-stroke-color": STATUS_COLOR_EXPRESSION
    }
} satisfies LayerProps;
