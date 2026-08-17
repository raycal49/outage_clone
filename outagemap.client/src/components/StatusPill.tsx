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

const BEACONS: Record<ConnectionState, string> = {
    connecting: 'bg-state-warn',
    live: 'bg-state-live animate-beacon motion-reduce:animate-none',
    reconnecting: 'bg-state-warn',
    offline: 'bg-state-down'
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
        <div
            role="status"
            aria-live="polite"
            className="status-pill pointer-events-none absolute top-3 left-3 z-3 inline-flex leading-[normal]
                       items-center gap-2 rounded-[999px] border border-ui-border bg-ui-surface
                       py-1.5 pr-3 pl-2.5 font-ui-mono text-[11px] tracking-[.04em] whitespace-nowrap
                       text-ui-text shadow-ui-panel backdrop-blur-[9px] backdrop-saturate-[1.2]
                       max-[640px]:top-auto max-[640px]:bottom-3"
        >
            <span aria-hidden="true" className={`size-[7px] shrink-0 rounded-full ${BEACONS[state]}`} />
            <span>{LABELS[state]}</span>
            {age !== null && (
                <>
                    <span aria-hidden="true" className="text-white/30">·</span>
                    <span className="text-white/58 tabular-nums">updated {age} ago</span>
                </>
            )}
        </div>
    );
}
