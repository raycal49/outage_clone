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
            className="popup flex w-[246px] flex-col gap-[11px] leading-[normal] rounded-[10px] border border-ui-border
                       bg-ui-surface-solid px-[14px] py-[13px] font-ui-sans text-ui-text
                       shadow-ui-popup backdrop-blur-[14px] backdrop-saturate-[1.3]"
        >
            {/* pr clears the Mapbox close button, which is positioned over this row */}
            <div className="flex items-center justify-between gap-2.5 pr-[18px]">
                <span
                    className="inline-flex items-center gap-1.5 rounded-[999px] border py-1 pr-[9px]
                               pl-[7px] font-ui-mono text-[10px] leading-[1.25] tracking-[.06em]
                               whitespace-nowrap uppercase"
                    style={{ color, borderColor: `${color}66`, background: `${color}1f` }}
                >
                    <span className="size-1.5 shrink-0 rounded-full" style={{ background: color }} />
                    {status}
                </span>
            </div>

            <div className="flex flex-col gap-px">
                <span className="font-ui-mono text-[25px] leading-[1.05] tracking-[-.02em] tabular-nums">
                    {formatRelativeEtr(properties.etrTime)}
                </span>
                <span className="font-ui-mono text-[9.5px] tracking-[.12em] uppercase text-white/42">
                    Estimated restoration
                </span>
            </div>

            {rows.length > 0 && (
                <dl className="m-0 flex flex-col gap-[5px] border-t border-white/10 pt-2.5">
                    {rows.map(row => (
                        <div key={row.label} className="flex items-baseline justify-between gap-3">
                            <dt className="font-ui-mono text-[9.5px] tracking-[.11em] whitespace-nowrap uppercase text-white/42">
                                {row.label}
                            </dt>
                            <dd className="m-0 text-right text-[12px] text-white/93">{row.value}</dd>
                        </div>
                    ))}
                </dl>
            )}
        </div>
    );
}
