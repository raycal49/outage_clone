import type { Map as MapboxMap } from 'mapbox-gl';

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
