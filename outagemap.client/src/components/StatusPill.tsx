import { useEffect, useState } from 'react';
import { formatAge } from '@/lib/format';
import type { ConnectionState } from '@/lib/outageHub';

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
            className="status-pill pointer-events-none absolute top-3 left-3 z-3 inline-flex items-center
                       gap-2 rounded-full border border-ui-border bg-ui-surface py-1.5 pr-3 pl-2.5
                       font-ui-mono text-xs tracking-wide whitespace-nowrap text-ui-text shadow-panel
                       backdrop-blur-sm"
        >
            <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${BEACONS[state]}`} />
            <span>{LABELS[state]}</span>
            {age !== null && (
                <>
                    <span aria-hidden="true" className="text-white/30">·</span>
                    <span className="text-white/60 tabular-nums">updated {age} ago</span>
                </>
            )}
        </div>
    );
}
