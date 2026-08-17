import { Area, AreaChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { OutageSummary, TrendBucket } from '../lib/outages';

type OutageStatsProps = {
    summary: OutageSummary;
};

/** Neutral ink, not a status colour - the trend is the total, not a category. */
const TREND_INK = '#e2e8f0';

function TrendTooltip({ active, payload }: {
    active?: boolean;
    payload?: { payload: TrendBucket }[];
}) {
    if (!active || !payload?.length) return null;

    const bucket = payload[0].payload;

    return (
        <div className="stats__tip">
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
        <section className="stats" aria-label="Outage summary">
            <header className="stats__head">
                <span>Active outages</span>
                <span>Houston metro</span>
            </header>

            <div className="stats__tiles">
                <div className="stats__tile">
                    <span className="stats__big">{total.toLocaleString()}</span>
                    <span className="stats__cap">Outages</span>
                </div>
                <div className="stats__tile">
                    <span className="stats__big">{customers.toLocaleString()}</span>
                    <span className="stats__cap">Customers</span>
                </div>
            </div>

            {total > 0 && (
                <div className="stats__stack" aria-hidden="true">
                    {byStatus
                        .filter(entry => entry.count > 0)
                        .map(entry => (
                            <i
                                key={entry.status}
                                style={{ flex: entry.count, background: entry.color }}
                            />
                        ))}
                </div>
            )}

            <ul className="stats__breakdown">
                {byStatus.map(entry => (
                    <li key={entry.status} className="stats__row">
                        <span className="stats__swatch" style={{ background: entry.color }} />
                        <span className="stats__name">{entry.status}</span>
                        <span className="stats__count">{entry.count}</span>
                    </li>
                ))}
            </ul>

            {hasTrend && (
                <div className="stats__trend">
                    <span className="stats__cap">Started, last 6h</span>
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

            <footer className="stats__foot">
                <span>Largest</span>
                <span className="stats__foot-value">
                    {largest.toLocaleString()} customers
                </span>
            </footer>
        </section>
    );
}
