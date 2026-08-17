import { useState, useEffect, useMemo, useRef } from 'react';
import Map, { FullscreenControl, GeolocateControl, NavigationControl, Source, Layer, Popup, type LayerProps, type MapMouseEvent, type MapRef } from 'react-map-gl/mapbox';
import GeocoderControl from './Geocoder';
import { HubConnectionBuilder } from '@microsoft/signalr';
import StatusPill from './components/StatusPill';
import OutageStats from './components/OutageStats';
import OutagePopup from './components/OutagePopup';
import type { ExpressionSpecification } from 'mapbox-gl';
import { collectIds, featuresWithNewIds, summariseOutages, STATUS_COLORS, UNKNOWN_STATUS_COLOR, type ConnectionState, type OutageCollection, type OutageFeature } from './lib/outages';
import './Map.css';
import './ui.css';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

/** How long a newly arrived outage keeps its bloom ring. */
const ARRIVAL_MS = 1600;
const ARRIVAL_RADIUS_FROM = 6;
const ARRIVAL_RADIUS_TO = 40;

const POINT_RADIUS_MIN = 4;
const POINT_RADIUS_MAX = 14;
const HALO_RADIUS_MIN = 11;
const HALO_RADIUS_MAX = 40;

/**
 * Observed range of numPeople in the CenterPoint feed. Radius is interpolated
 * against sqrt(numPeople) so that a circle's *area*, not its radius, tracks the
 * customer count - scaling radius linearly would badly over-weight large outages.
 */
const CUSTOMERS_MIN = 1;
const CUSTOMERS_MAX = 182;

function scaleByCustomers(minRadius: number, maxRadius: number): ExpressionSpecification {
    return [
        "interpolate",
        ["linear"],
        ["sqrt", ["coalesce", ["get", "numPeople"], CUSTOMERS_MIN]],
        Math.sqrt(CUSTOMERS_MIN), minRadius,
        Math.sqrt(CUSTOMERS_MAX), maxRadius
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

    const outageHaloLayer = {
        id: "outage-halos",
        type: "circle",
        paint: {
            "circle-radius": scaleByCustomers(HALO_RADIUS_MIN, HALO_RADIUS_MAX),
            "circle-color": STATUS_COLOR_EXPRESSION,
            "circle-opacity": 0.3,
            "circle-blur": 1
        }
    } satisfies LayerProps;

    const outageLayer = {
        id: "outage-points",
        type: "circle",
        paint: {
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
            "circle-radius": ARRIVAL_RADIUS_FROM,
            "circle-opacity": 0,
            "circle-stroke-width": 2,
            "circle-stroke-opacity": 0.9,

            "circle-stroke-color": STATUS_COLOR_EXPRESSION
        }
    } satisfies LayerProps;

    const handleMapClick = (e: MapMouseEvent) => {

        const f = e.features?.[0] as OutageFeature | undefined;
        if (!f) return;

        const [lng, lat] = (f.geometry as GeoJSON.Point).coordinates as [number, number];

        setSelectedOutage(f);
        setPopupLngLat({ lng, lat });
    };

    return (
        <>
            <div className="mapdiv">
                <Map
                    ref={mapRef}
                    {...viewState}
                    onMove={(evt) => setViewState(evt.viewState)}
                    mapStyle="mapbox://styles/mapbox/dark-v11"
                    mapboxAccessToken={MAPBOX_TOKEN}
                    hash={true}
                    reuseMaps={true}
                    interactiveLayerIds={["outage-points"]}
                    onClick={handleMapClick}
                >
                    <GeocoderControl
                        mapboxAccessToken={MAPBOX_TOKEN}
                        position="top-left"
                        marker={false}
                    />

                    {outageFc && (
                        <Source id="outages" type="geojson" data={outageFc}>
                            <Layer {...outageHaloLayer} />
                            <Layer {...outageLayer} />
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
