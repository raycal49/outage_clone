import type { GeoJSONSource } from 'mapbox-gl';
import type { MapRef } from 'react-map-gl/mapbox';

export function zoomToCluster(map: MapRef, clusterId: number, center: [number, number]): void {
    const source = map.getSource("outages") as GeoJSONSource | undefined;

    source?.getClusterExpansionZoom(clusterId, (error, zoom) => {
        if (error || zoom == null) return;
        map.easeTo({ center, zoom, duration: 700 });
    });
}
