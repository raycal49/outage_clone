import { formatOutageAge, formatRelativeEtr, toTitleCase } from '../lib/format';
import { statusColor, UNCLASSIFIED_STATUS, type OutageFeature } from '../lib/outages';

type OutagePopupProps = {
    outage: OutageFeature;
};

type Row = { label: string; value: string };

/**
 * Detail for a single outage.
 *
 * Rows whose value the feed did not send are omitted rather than rendered with
 * a placeholder: cause is null on roughly two thirds of records, so a row that
 * is permanently empty would read as a bug rather than as missing data.
 */
export default function OutagePopup({ outage }: OutagePopupProps) {
    const properties = outage.properties ?? {};
    const status = properties.status ?? UNCLASSIFIED_STATUS;
    const color = statusColor(properties.status);

    const rows: Row[] = [];

    if (typeof properties.numPeople === 'number')
        rows.push({ label: 'Customers', value: properties.numPeople.toLocaleString() });

    // Cause is frequently just a restatement of the status ("Planned Outage"),
    // which tells the reader nothing they cannot already see on the chip.
    const cause = toTitleCase(properties.cause);
    if (cause && cause.toLowerCase() !== status.toLowerCase())
        rows.push({ label: 'Cause', value: cause });

    const city = toTitleCase(properties.city);
    if (city) rows.push({ label: 'Area', value: city });

    const serviceArea = toTitleCase(properties.serviceArea);
    if (serviceArea && serviceArea !== city)
        rows.push({ label: 'Service area', value: serviceArea });

    const age = formatOutageAge(properties.startTime);
    if (age) rows.push({ label: 'Out for', value: age });

    if (typeof properties.id === 'number')
        rows.push({ label: 'ID', value: `#${properties.id}` });

    return (
        <div
            className="popup flex w-60 flex-col gap-3 rounded-lg border border-ui-border
                       bg-ui-surface-solid p-3.5 font-ui-sans text-ui-text shadow-popup backdrop-blur-md"
        >
            {/* pr clears the Mapbox close button, which is positioned over this row */}
            <div className="flex items-center pr-5">
                <span
                    className="inline-flex items-center gap-1.5 rounded-full border py-1 pr-2.5 pl-2
                               font-ui-mono text-2xs leading-tight tracking-wider whitespace-nowrap uppercase"
                    style={{ color, borderColor: `${color}66`, background: `${color}1f` }}
                >
                    <span className="size-1.5 shrink-0 rounded-full" style={{ background: color }} />
                    {status}
                </span>
            </div>

            <div className="flex flex-col">
                <span className="font-ui-mono text-2xl leading-none tracking-tight tabular-nums">
                    {formatRelativeEtr(properties.etrTime)}
                </span>
                <span className="font-ui-mono text-2xs tracking-widest uppercase text-white/40">
                    Estimated restoration
                </span>
            </div>

            {rows.length > 0 && (
                <dl className="flex flex-col gap-1.5 border-t border-white/10 pt-2.5">
                    {rows.map(row => (
                        <div key={row.label} className="flex items-baseline justify-between gap-3">
                            <dt className="font-ui-mono text-2xs tracking-widest whitespace-nowrap uppercase text-white/40">
                                {row.label}
                            </dt>
                            <dd className="text-right text-xs text-white/95">{row.value}</dd>
                        </div>
                    ))}
                </dl>
            )}
        </div>
    );
}
