import type { Map as MapboxMap } from 'mapbox-gl';

export function applyBasemapConfig(map: MapboxMap): void {
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
}
