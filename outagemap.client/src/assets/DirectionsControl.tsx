import { useEffect } from 'react';
import { useControl, type ControlPosition } from 'react-map-gl/mapbox';
import mapboxgl from 'mapbox-gl';

// Use the dist path — it’s the most reliable in Vite/Cra:
import MapboxDirections from '@mapbox/mapbox-gl-directions';
import '@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions.css';

type DirectionsOptions = {
    unit?: 'metric' | 'imperial';
    profile?: 'mapbox/driving' | 'mapbox/walking' | 'mapbox/cycling' | 'mapbox/driving-traffic';
    alternatives?: boolean;
    language?: string;
    controls?: { inputs?: boolean; instructions?: boolean };
};

type Props = {
    position?: ControlPosition;
    options?: DirectionsOptions;
    origin?: [number, number] | string | null;
    destination?: [number, number] | string | null;
    onRoute?: (routes: any) => void;     // plugin emits route JSON
    onClear?: () => void;
};

export default function DirectionsControl({
    position = 'top-left',
    options,
    origin,
    destination,
    onRoute,
    onClear
}: Props) {
    const ctrl = useControl(
        () => new (MapboxDirections as any)({ accessToken: mapboxgl.accessToken, ...options }),
        { position }
    );

    useEffect(() => {
        const handleRoute = (e: any) => onRoute?.(e.route);
        const handleClear = () => onClear?.();

        // @ts-expect-error: plugin is untyped in many setups
        ctrl.on?.('route', handleRoute);
        // @ts-expect-error
        ctrl.on?.('clear', handleClear);

        return () => {
            // @ts-expect-error
            ctrl.off?.('route', handleRoute);
            // @ts-expect-error
            ctrl.off?.('clear', handleClear);
        };
    }, [ctrl, onRoute, onClear]);

    useEffect(() => {
        if (origin) ctrl.setOrigin(origin as any);
    }, [ctrl, origin]);

    useEffect(() => {
        if (destination) ctrl.setDestination(destination as any);
    }, [ctrl, destination]);

    return null;
}
