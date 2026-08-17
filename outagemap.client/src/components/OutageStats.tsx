import { Area, AreaChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { OutageSummary, TrendBucket } from '../lib/outages';

type OutageStatsProps = {
    summary: OutageSummary;
};

/** Neutral ink, not a status colour - the trend is the total, not a category. */
const TREND_INK = '#e2e8f0';

const CAP = 'font-ui-mono text-[9.5px] tracking-[.12em] uppercase text-white/50';
const BAND = 'flex items-center justify-between gap-2.5 font-ui-mono text-[9.5px] tracking-[.16em] uppercase text-white/48';

function TrendTooltip({ active, payload }: {
    active?: boolean;
    payload?: { payload: TrendBucket }[];
}) {
    if (!active || !payload?.length) return null;

    const bucket = payload[0].payload;

    return (
        <div className="rounded-[5px] border border-ui-border bg-[rgba(13,12,18,.94)] px-2 py-1
                        font-ui-mono text-[10.5px] whitespace-nowrap text-ui-text">
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

    return (
        <section
            aria-label="Outage summary"
            className="absolute top-[52px] left-3 z-3 flex w-[min(258px,calc(100%-24px))] flex-col leading-[normal]
                       gap-3 rounded-[9px] border border-ui-border bg-ui-surface px-[14px] pt-[13px]
                       pb-[14px] font-ui-sans text-ui-text shadow-ui-panel backdrop-blur-[12px]
                       backdrop-saturate-[1.25] max-[640px]:top-3 max-[640px]:gap-[9px]
                       max-[640px]:w-[min(216px,calc(100%-24px))] max-[640px]:px-3
                       max-[640px]:pt-2.5 max-[640px]:pb-[11px]"
        >
            <header className={`${BAND} max-[640px]:hidden`}>
                <span>Active outages</span>
                <span>Houston metro</span>
            </header>

            <div className="grid grid-cols-2 gap-x-2 gap-y-2.5">
                <div className="flex min-w-0 flex-col gap-px">
                    <span className="font-ui-mono text-[21px] leading-[1.1] tracking-[-.02em] tabular-nums max-[640px]:text-[17px]">
                        {total.toLocaleString()}
                    </span>
                    <span className={CAP}>Outages</span>
                </div>
                <div className="flex min-w-0 flex-col gap-px">
                    <span className="font-ui-mono text-[21px] leading-[1.1] tracking-[-.02em] tabular-nums max-[640px]:text-[17px]">
                        {customers.toLocaleString()}
                    </span>
                    <span className={CAP}>Customers</span>
                </div>
            </div>

            {total > 0 && (
                /* Proportion bar. 2px surface gaps keep adjacent segments legible. */
                <div aria-hidden="true" className="flex h-[7px] gap-0.5 overflow-hidden rounded-[4px]">
                    {byStatus
                        .filter(entry => entry.count > 0)
                        .map(entry => (
                            <i
                                key={entry.status}
                                className="block h-full min-w-0.5"
                                style={{ flex: entry.count, background: entry.color }}
                            />
                        ))}
                </div>
            )}

            <ul className="m-0 flex list-none flex-col gap-[5px] p-0">
                {byStatus.map(entry => (
                    <li
                        key={entry.status}
                        className="grid grid-cols-[8px_1fr_auto] items-center gap-2 text-[11px]
                                   text-white/78 max-[640px]:text-[10.5px]"
                    >
                        <span className="size-2 rounded-[2px]" style={{ background: entry.color }} />
                        <span className="truncate">{entry.status}</span>
                        <span className="font-ui-mono tabular-nums text-white/95">{entry.count}</span>
                    </li>
                ))}
            </ul>

            {hasTrend && (
                <div className="flex flex-col gap-1 max-[640px]:hidden">
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

            <footer className={`${BAND} border-t border-white/10 pt-[9px] max-[640px]:hidden`}>
                <span>Largest</span>
                <span className="text-white/90 tabular-nums">{largest.toLocaleString()} customers</span>
            </footer>
        </section>
    );
}
