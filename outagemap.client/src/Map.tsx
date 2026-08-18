import { useState, useEffect, useMemo, useRef } from 'react';
import Map, { AttributionControl, FullscreenControl, GeolocateControl, NavigationControl, Source, Layer, Popup, type LayerProps, type MapMouseEvent, type MapRef } from 'react-map-gl/mapbox';
import { HubConnectionBuilder } from '@microsoft/signalr';
import StatusPill from './components/StatusPill';
import OutageStats from './components/OutageStats';
import OutagePopup from './components/OutagePopup';
import type { ExpressionSpecification, GeoJSONSource } from 'mapbox-gl';
import { collectIds, featuresWithNewIds, summariseOutages, STATUS_COLORS, UNKNOWN_STATUS_COLOR, type ConnectionState, type OutageCollection, type OutageFeature } from './lib/outages';
import './mapbox-overrides.css';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

/** How long a newly arrived outage keeps its bloom ring. */
const ARRIVAL_MS = 1600;
const ARRIVAL_RADIUS_FROM = 6;
const ARRIVAL_RADIUS_TO = 40;

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
const CLUSTER_MAX_ZOOM = 12;
const CLUSTER_RADIUS = 50;
const CLUSTER_MIN_POINTS = 3;

const POINT_RADIUS_MIN = 7;
const POINT_RADIUS_MAX = 20;
const HALO_RADIUS_MIN = 18;
const HALO_RADIUS_MAX = 50;

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
 * Dots also grow with zoom. A fixed pixel radius looks progressively smaller as
 * the map zooms in, because everything around it gains detail while the dot does
 * not. Zoom must be the outermost interpolation for a zoom-and-data expression.
 */
const ZOOM_SCALE_MIN = 9;
const ZOOM_SCALE_MAX = 15;
const ZOOM_SCALE_AT_MIN = 0.85;
const ZOOM_SCALE_AT_MAX = 1.3;

function scaleByCustomers(minRadius: number, maxRadius: number): ExpressionSpecification {
    const atZoom = (factor: number): ExpressionSpecification => [
        "interpolate",
        ["linear"],
        ["sqrt", ["coalesce", ["get", "numPeople"], CUSTOMERS_MIN]],
        Math.sqrt(CUSTOMERS_MIN), minRadius * factor,
        Math.sqrt(CUSTOMERS_MAX), maxRadius * factor
    ];

    return [
        "interpolate",
        ["linear"],
        ["zoom"],
        ZOOM_SCALE_MIN, atZoom(ZOOM_SCALE_AT_MIN),
        ZOOM_SCALE_MAX, atZoom(ZOOM_SCALE_AT_MAX)
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

function MyMap() {
    const [viewState, setViewState] = useState({
        longitude: -95.3698,
        latitude: 29.7604,
        zoom: 10.50
    });

    const geoRef = useRef<mapboxgl.GeolocateControl | null>(null);
    const mapRef = useRef<MapRef | null>(null);

    const [selectedOutage, setSelectedOutage] = useState<OutageFeature | null>(null);
    const [popupLngLat, setPopupLngLat] = useState<{ lng: number; lat: number } | null>(null);
    const [outageFc, setOutageFc] = useState<OutageCollection | null>(null);

    const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');
    const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
    const [arrivals, setArrivals] = useState<OutageCollection | null>(null);

    // Recomputed only when a new payload lands, not on every map pan.
    const summary = useMemo(() => summariseOutages(outageFc, lastUpdatedAt ?? Date.now()), [outageFc, lastUpdatedAt]);

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

            setOutageFc(fc);
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

        const connection = new HubConnectionBuilder()
            .withUrl("/outageHub")
            .withAutomaticReconnect()
            .build();

        const handleOutagesChanged = () => {
            refreshOutages().catch(console.error);
        };

        connection.on("OutagesChanged", handleOutagesChanged);

        connection.onreconnecting(() => setConnectionState('reconnecting'));

        connection.onreconnected(() => {
            setConnectionState('live');
            refreshOutages().catch(console.error);
        });

        connection.onclose(() => setConnectionState('offline'));

        refreshOutages().catch(console.error);

        connection
            .start()
            .then(() => setConnectionState('live'))
            .catch(error => {
                console.error(error);
                setConnectionState('offline');
            });

        return () => {
            if (arrivalTimerRef.current !== null)
                window.clearTimeout(arrivalTimerRef.current);

            connection.off("OutagesChanged", handleOutagesChanged);
            connection.stop().catch(console.error);
        };
    }, []);

    // Escape closes the popup, matching the dialog convention.
    useEffect(() => {
        if (!selectedOutage) return;

        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setSelectedOutage(null);
                setPopupLngLat(null);
            }
        };

        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [selectedOutage]);

    // Expand and fade the arrival rings. Driven by setPaintProperty rather than React
    // state so the animation never re-renders the map.
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

            // The layer is added by the child <Layer>, which may not have mounted on
            // the first frame. Keep animating rather than bailing out, so a late
            // layer still picks the animation up mid-flight.
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
    }, [arrivals]);

    /*
     * Cluster bubble: dark centre, bright rim. On this near-black basemap a pale
     * translucent fill reads as a smudge, so the separation comes from a hard
     * bright edge - the same halo logic the basemap's own labels use. Kept
     * achromatic on purpose: every violet and magenta candidate collided with the
     * blue "Crew Assessing" status under colour-vision simulation, and a coloured
     * cluster would imply a status that a mixed group does not have.
     */
    const clusterLayer = {
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

    const clusterCountLayer = {
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

    const outageHaloLayer = {
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

    const outageLayer = {
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
            "circle-stroke-width": 1,
            "circle-stroke-color": "rgba(0, 0, 0, 0.55)",
            "circle-color": STATUS_COLOR_EXPRESSION
        }
    } satisfies LayerProps;

    // Ring drawn over a newly arrived outage. Starts at the point radius and is
    // expanded/faded by the animation effect above.
    const arrivalLayer = {
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

    /*
     * Mapbox Standard exposes its look through style config rather than through a
     * separate style URL. The night preset supplies the slight cool cast the legacy
     * dark style lacks, and hiding POI labels keeps the ground recessive so the
     * outage dots stay the brightest thing on screen.
     *
     * Deliberately NOT setting theme: "monochrome". A colour theme installs a LUT
     * that every layer inherits unless it opts out with the paint property
     * "color-use-theme", so a monochrome basemap silently desaturates the outage
     * dots too - every status rendered black and the map became unreadable.
     *
     * These keys are declared by the style itself, not by mapbox-gl, so an
     * unrecognised one is tolerated rather than allowed to break the map.
     */
    const applyBasemapConfig = () => {
        const map = mapRef.current?.getMap();
        if (!map) return;

        const config: Record<string, unknown> = {
            lightPreset: "night",
            showPointOfInterestLabels: false,
            showRoadLabels: false,
            showTransitLabels: false
        };

        for (const [key, value] of Object.entries(config)) {
            try {
                map.setConfigProperty("basemap", key, value);
            } catch (error) {
                console.warn(`basemap config "${key}" not applied`, error);
            }
        }
    };

    const closePopup = () => {
        setSelectedOutage(null);
        setPopupLngLat(null);
    };

    const handleMapClick = (e: MapMouseEvent) => {
        const feature = e.features?.[0];

        // Clicking bare map dismisses the popup. Mapbox's own closeOnClick is left
        // off because it races with opening a new popup when moving point to point.
        if (!feature) {
            closePopup();
            return;
        }

        const [lng, lat] = (feature.geometry as GeoJSON.Point).coordinates as [number, number];

        // A cluster is not an outage - zoom to the point where it breaks apart.
        const clusterId = feature.properties?.cluster_id;

        if (typeof clusterId === "number") {
            const source = mapRef.current?.getSource("outages") as GeoJSONSource | undefined;

            source?.getClusterExpansionZoom(clusterId, (error, zoom) => {
                if (error || zoom == null) return;
                mapRef.current?.easeTo({ center: [lng, lat], zoom, duration: 700 });
            });

            closePopup();
            return;
        }

        setSelectedOutage(feature as OutageFeature);
        setPopupLngLat({ lng, lat });
    };

    // Pointer feedback so clusters and dots read as clickable.
    const handleMapMove = (e: MapMouseEvent) => {
        const map = mapRef.current?.getMap();
        if (map) map.getCanvas().style.cursor = e.features?.length ? "pointer" : "";
    };

    return (
        <>
            <div className="mapdiv">
                <Map
                    ref={mapRef}
                    {...viewState}
                    onMove={(evt) => setViewState(evt.viewState)}
                    mapStyle="mapbox://styles/mapbox/standard"
                    mapboxAccessToken={MAPBOX_TOKEN}
                    attributionControl={false}
                    logoPosition="bottom-right"
                    hash={true}
                    reuseMaps={true}
                    interactiveLayerIds={["outage-points", "outage-clusters"]}
                    onClick={handleMapClick}
                    onMouseMove={handleMapMove}
                    onLoad={applyBasemapConfig}
                >
                    {outageFc && (
                        <Source
                            id="outages"
                            type="geojson"
                            data={outageFc}
                            cluster={true}
                            clusterRadius={CLUSTER_RADIUS}
                            clusterMaxZoom={CLUSTER_MAX_ZOOM}
                            clusterMinPoints={CLUSTER_MIN_POINTS}
                            clusterProperties={{ customers: ["+", ["coalesce", ["get", "numPeople"], 0]] }}
                        >
                            <Layer {...outageHaloLayer} />
                            <Layer {...outageLayer} />
                            <Layer {...clusterLayer} />
                            <Layer {...clusterCountLayer} />
                        </Source>
                    )}

                    {arrivals && (
                        <Source id="outage-arrivals" type="geojson" data={arrivals}>
                            <Layer {...arrivalLayer} />
                        </Source>
                    )}

                    {selectedOutage && popupLngLat && (
                        <Popup
                            longitude={popupLngLat.lng}
                            latitude={popupLngLat.lat}
                            anchor="top"
                            closeOnClick={false}
                            className="popup-shell"
                            maxWidth="none"
                            onClose={() => {
                                setSelectedOutage(null);
                                setPopupLngLat(null);
                            }}
                        >
                            <OutagePopup outage={selectedOutage} />
                        </Popup>
                    )}

                    <AttributionControl compact position="bottom-right" />

                    <GeolocateControl ref={geoRef} />
                    <FullscreenControl />
                    <NavigationControl />
                </Map>

                <StatusPill state={connectionState} lastUpdatedAt={lastUpdatedAt} />
                {outageFc && <OutageStats summary={summary} />}
            </div>
        </>
    );
}

export default MyMap;
