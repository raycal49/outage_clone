import type { GeoJSONSource } from 'mapbox-gl';
import type { MapRef } from 'react-map-gl/mapbox';

/**
 * Ease to the zoom at which a cluster breaks apart into its members.
 *
 * The expansion zoom is only known to the clustering index inside the source,
 * so it has to be asked for asynchronously rather than computed here.
 */
export function zoomToCluster(map: MapRef, clusterId: number, center: [number, number]): void {
    const source = map.getSource("outages") as GeoJSONSource | undefined;

    source?.getClusterExpansionZoom(clusterId, (error, zoom) => {
        if (error || zoom == null) return;
        map.easeTo({ center, zoom, duration: 700 });
    });
}
