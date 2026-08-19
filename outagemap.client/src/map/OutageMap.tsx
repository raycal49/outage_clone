import { useMemo, useRef, useState } from 'react';
import Map, { AttributionControl, FullscreenControl, GeolocateControl, NavigationControl, Source, Layer, Popup, type MapMouseEvent, type MapRef } from 'react-map-gl/mapbox';
import StatusPill from '@/components/StatusPill';
import OutageStats from '@/components/OutageStats';
import OutagePopup from '@/components/OutagePopup';
import { summariseOutages, type OutageFeature } from '@/lib/outages';
import { useOutageFeed } from '@/hooks/useOutageFeed';
import { useOutageSelection } from '@/hooks/useOutageSelection';
import {
    arrivalLayer,
    CLUSTER_MAX_ZOOM,
    CLUSTER_MIN_POINTS,
    CLUSTER_RADIUS,
    clusterCountLayer,
    clusterLayer,
    outageHaloLayer,
    outageLayer
} from './layers';
import { applyBasemapConfig } from './basemap';
import { zoomToCluster } from './interactions';
import { useArrivalPulse } from './useArrivalPulse';
import '@/mapbox-overrides.css';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

function OutageMap() {
    const [viewState, setViewState] = useState({
        longitude: -95.3698,
        latitude: 29.7604,
        zoom: 10.50
    });

    const geoRef = useRef<mapboxgl.GeolocateControl | null>(null);
    const mapRef = useRef<MapRef | null>(null);

    const { outages, arrivals, connectionState, lastUpdatedAt } = useOutageFeed();
    const { selected, lngLat, select, close } = useOutageSelection();

    useArrivalPulse(mapRef, arrivals);

    // Recomputed only when a new payload lands, not on every map pan.
    const summary = useMemo(() => summariseOutages(outages, lastUpdatedAt ?? Date.now()), [outages, lastUpdatedAt]);

    const handleMapLoad = () => {
        const map = mapRef.current?.getMap();
        if (map) applyBasemapConfig(map);
    };

    const handleMapClick = (e: MapMouseEvent) => {
        const feature = e.features?.[0];

        // Clicking bare map dismisses the popup. Mapbox's own closeOnClick is left
        // off because it races with opening a new popup when moving point to point.
        if (!feature) {
            close();
            return;
        }

        const [lng, lat] = (feature.geometry as GeoJSON.Point).coordinates as [number, number];

        // A cluster is not an outage - zoom to the point where it breaks apart.
        const clusterId = feature.properties?.cluster_id;

        if (typeof clusterId === "number") {
            if (mapRef.current) zoomToCluster(mapRef.current, clusterId, [lng, lat]);

            close();
            return;
        }

        select(feature as OutageFeature, { lng, lat });
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
                    onLoad={handleMapLoad}
                >
                    {outages && (
                        <Source
                            id="outages"
                            type="geojson"
                            data={outages}
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

                    {selected && lngLat && (
                        <Popup
                            longitude={lngLat.lng}
                            latitude={lngLat.lat}
                            anchor="top"
                            closeOnClick={false}
                            className="popup-shell"
                            maxWidth="none"
                            onClose={close}
                        >
                            <OutagePopup outage={selected} />
                        </Popup>
                    )}

                    <AttributionControl compact position="bottom-right" />

                    <GeolocateControl ref={geoRef} />
                    <FullscreenControl />
                    <NavigationControl />
                </Map>

                <StatusPill state={connectionState} lastUpdatedAt={lastUpdatedAt} />
                {outages && <OutageStats summary={summary} />}
            </div>
        </>
    );
}

export default OutageMap;
