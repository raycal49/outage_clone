import { useEffect, useState } from 'react';
import { formatAge, type ConnectionState } from '../lib/outages';

type StatusPillProps = {
    state: ConnectionState;
    lastUpdatedAt: number | null;
};

const LABELS: Record<ConnectionState, string> = {
    connecting: 'Connecting',
    live: 'Live',
    reconnecting: 'Reconnecting',
    offline: 'Offline'
};

/**
 * Connection and freshness readout for the live outage feed.
 *
 * The feed publishes on a ~10 minute cadence, so this is the part of the UI that
 * tells a viewer the data is current between updates. It owns its own clock so
 * ticking the age label re-renders the pill rather than the whole map.
 */
export default function StatusPill({ state, lastUpdatedAt }: StatusPillProps) {
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const id = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(id);
    }, []);

    const age = lastUpdatedAt === null ? null : formatAge(now - lastUpdatedAt);

    return (
        <div className={`status-pill status-pill--${state}`} role="status" aria-live="polite">
            <span className="status-pill__beacon" aria-hidden="true" />
            <span className="status-pill__label">{LABELS[state]}</span>
            {age !== null && (
                <>
                    <span className="status-pill__sep" aria-hidden="true">·</span>
                    <span className="status-pill__age">updated {age} ago</span>
                </>
            )}
        </div>
    );
}
