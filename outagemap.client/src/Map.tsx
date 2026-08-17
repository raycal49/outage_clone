import { useState, useEffect, useRef } from 'react';
import Map, { FullscreenControl, GeolocateControl, NavigationControl, Source, Layer, Popup, type LayerProps, type MapMouseEvent } from 'react-map-gl/mapbox';
import GeocoderControl from './Geocoder';
import type { Feature, FeatureCollection, Point } from 'geojson';
import { HubConnectionBuilder } from '@microsoft/signalr';
import './Map.css';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

function MyMap() {
    const [viewState, setViewState] = useState({
        longitude: -95.3698,
        latitude: 29.7604,
        zoom: 10.50
    });

    const geoRef = useRef<mapboxgl.GeolocateControl | null>(null);

    type OutageProperties = {
        status?: string;
        numPeople?: number | string;
        etrTime?: number | string;
    };

    type OutageFeature = Feature<Point, OutageProperties>;

    const [selectedOutage, setSelectedOutage] = useState<OutageFeature | null>(null);
    const [popupLngLat, setPopupLngLat] = useState<{ lng: number; lat: number } | null>(null);
    const [outageFc, setOutageFc] = useState<FeatureCollection<Point> | null>(null);

    // useEffect(() => {
    //     (async () => {
    //         const res = await fetch("/OutageMap/OutageData");
    //         if (!res.ok) throw new Error(`OutageData failed (${res.status})`);
    //         const fc: FeatureCollection<Point> = await res.json();
    //         setOutageFc(fc);
    //     })().catch(console.error);
    // }, []);

    useEffect(() => {
        const refreshOutages = async () => {
            const res = await fetch("/OutageMap/OutageData");

            if (!res.ok)
                throw new Error(`OutageData failed (${res.status})`);

            const fc: FeatureCollection<Point> = await res.json();

            setOutageFc(fc);
        };

        const connection = new HubConnectionBuilder()
            .withUrl("/outageHub")
            .withAutomaticReconnect()
            .build();

        const handleOutagesChanged = () => {
            refreshOutages().catch(console.error);
        };

        connection.on("OutagesChanged", handleOutagesChanged);

        connection.onreconnected(() => {
            refreshOutages().catch(console.error);
        });

        refreshOutages().catch(console.error);
        connection.start().catch(console.error);

        return () => {
            connection.off("OutagesChanged", handleOutagesChanged);
            connection.stop().catch(console.error);
        };
    }, []);

    const outageLayer = {
        id: "outage-points",
        type: "circle",
        paint: {
            "circle-radius": 6,
            "circle-opacity": 0.85,
            "circle-stroke-width": 1,
            "circle-stroke-color": "#000",

            "circle-color": [
                "match",
                ["get", "status"],
                "Pending Assessment", "#f59e0b",
                "Crew Assessing", "#3b82f6",
                "Planned Outage", "#ef4444",
                "#10b981"
            ]
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
                    {...viewState}
                    onMove={(evt) => setViewState(evt.viewState)}
                    mapStyle="mapbox://styles/mapbox/streets-v12"
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
                            <Layer {...outageLayer} />
                        </Source>
                    )}

                    {selectedOutage && popupLngLat && (
                        <Popup
                            longitude={popupLngLat.lng}
                            latitude={popupLngLat.lat}
                            anchor="top"
                            closeOnClick={false}
                            onClose={() => {
                                setSelectedOutage(null);
                                setPopupLngLat(null);
                            }}
                        >
                            {(() => {
                                const p = selectedOutage.properties ?? {};
                                const status = p.status ?? "—";
                                const people = p.numPeople != null ? Number(p.numPeople) : "—";
                                const etr =
                                    p.etrTime != null
                                        ? new Date(Number(p.etrTime)).toLocaleString()
                                        : "—";

                                return (
                                    <div style={{ minWidth: 200 }}>
                                        <div><b>Status:</b> {status}</div>
                                        <div><b>People:</b> {people}</div>
                                        <div><b>ETR:</b> {etr}</div>
                                    </div>
                                );
                            })()}
                        </Popup>
                    )}

                    <GeolocateControl ref={geoRef} />
                    <FullscreenControl />
                    <NavigationControl />
                </Map>
            </div>
        </>
    );
}

export default MyMap;
