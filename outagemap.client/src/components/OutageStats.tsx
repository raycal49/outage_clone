import { Area, AreaChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { OutageSummary, TrendBucket } from '@/lib/outages';

type OutageStatsProps = {
    summary: OutageSummary;
};

/** Neutral ink, not a status colour - the trend is the total, not a category. */
const TREND_INK = '#e2e8f0';

const CAP = 'font-ui-mono text-2xs tracking-widest uppercase text-white/50';
const BAND = `flex items-center justify-between gap-2 ${CAP}`;

function TrendTooltip({ active, payload }: {
    active?: boolean;
    payload?: { payload: TrendBucket }[];
}) {
    if (!active || !payload?.length) return null;

    const bucket = payload[0].payload;

    return (
        <div className="rounded-sm border border-ui-border bg-ui-surface-solid px-2 py-1
                        font-ui-mono text-2xs whitespace-nowrap text-ui-text">
            {bucket.count} started · {bucket.label === 'now' ? 'this hour' : bucket.label}
        </div>
    );
}

/**
 * Summary of the current outage payload, drawn over the map.
 *
 * Every figure is derived from the FeatureCollection already held in state, so
 * the panel refreshes on each SignalR push without any extra request.
 */
export default function OutageStats({ summary }: OutageStatsProps) {
    const { total, customers, largest, byStatus, trend } = summary;
    const hasTrend = trend.some(bucket => bucket.count > 0);

    const tiles: { label: string; value: number }[] = [
        { label: 'Outages', value: total },
        { label: 'Customers', value: customers }
    ];

    return (
        <section
            aria-label="Outage summary"
            className="absolute top-13 left-3 z-3 flex w-64 flex-col gap-3 rounded-lg border
                       border-ui-border bg-ui-surface p-3.5 font-ui-sans text-ui-text shadow-panel
                       backdrop-blur-md max-sm:w-56 max-sm:gap-2 max-sm:p-3"
        >
            <header className={`${BAND} max-sm:hidden`}>
                <span>Active outages</span>
                <span>Houston metro</span>
            </header>

            <div className="grid grid-cols-2 gap-2">
                {tiles.map(tile => (
                    <div key={tile.label} className="flex min-w-0 flex-col">
                        <span className="font-ui-mono text-xl leading-none tracking-tight tabular-nums max-sm:text-base">
                            {tile.value.toLocaleString()}
                        </span>
                        <span className={CAP}>{tile.label}</span>
                    </div>
                ))}
            </div>

            {total > 0 && (
                /* Proportion bar. 2px surface gaps keep adjacent segments legible. */
                <div aria-hidden="true" className="flex h-2 gap-0.5 overflow-hidden rounded-sm">
                    {byStatus
                        .filter(entry => entry.count > 0)
                        .map(entry => (
                            <i
                                key={entry.status}
                                className="block h-full"
                                style={{ flex: entry.count, background: entry.color }}
                            />
                        ))}
                </div>
            )}

            <ul className="flex list-none flex-col gap-1.5">
                {byStatus.map(entry => (
                    <li key={entry.status} className="flex items-center gap-2 text-xs text-white/80">
                        <span className="size-2 shrink-0 rounded-xs" style={{ background: entry.color }} />
                        <span className="flex-1 truncate">{entry.status}</span>
                        <span className="font-ui-mono tabular-nums text-white">{entry.count}</span>
                    </li>
                ))}
            </ul>

            {hasTrend && (
                <div className="flex flex-col gap-1 max-sm:hidden">
                    <span className={CAP}>Started, last 6h</span>
                    <ResponsiveContainer width="100%" height={40}>
                        <AreaChart data={trend} margin={{ top: 2, right: 2, bottom: 0, left: 2 }}>
                            <defs>
                                <linearGradient id="stats-trend-fill" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={TREND_INK} stopOpacity={0.34} />
                                    <stop offset="100%" stopColor={TREND_INK} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <Tooltip
                                content={<TrendTooltip />}
                                cursor={{ stroke: 'rgba(255,255,255,.28)', strokeWidth: 1 }}
                            />
                            <Area
                                type="monotone"
                                dataKey="count"
                                stroke={TREND_INK}
                                strokeWidth={2}
                                fill="url(#stats-trend-fill)"
                                dot={false}
                                activeDot={{ r: 3, fill: TREND_INK, stroke: '#0d0c12', strokeWidth: 2 }}
                                isAnimationActive={false}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}

            <footer className={`${BAND} border-t border-white/10 pt-2 max-sm:hidden`}>
                <span>Largest</span>
                <span className="text-white/90 tabular-nums">{largest.toLocaleString()} customers</span>
            </footer>
        </section>
    );
}
