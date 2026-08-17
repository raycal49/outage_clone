const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Coarse duration: "45m", "2h 15m", "1d 3h". Always two units at most. */
export function formatDuration(ms: number): string {
    const total = Math.max(0, ms);

    if (total < HOUR)
        return `${Math.max(1, Math.round(total / MINUTE))}m`;

    if (total < DAY) {
        const hours = Math.floor(total / HOUR);
        return `${hours}h ${Math.round((total % HOUR) / MINUTE)}m`;
    }

    const days = Math.floor(total / DAY);

    return `${days}d ${Math.round((total % DAY) / HOUR)}h`;
}

/**
 * Time remaining until estimated restoration.
 *
 * 7 of 102 records in a representative feed snapshot carry no etrTime at all,
 * so the null case is the normal case, not an error - it must read as a real
 * state rather than as a broken date.
 */
export function formatRelativeEtr(etrMs: number | null | undefined, now: number = Date.now()): string {
    if (typeof etrMs !== 'number' || !Number.isFinite(etrMs))
        return 'Not yet estimated';

    const remaining = etrMs - now;

    return remaining <= 0 ? 'Overdue' : formatDuration(remaining);
}

/** How long an outage has been running. */
export function formatOutageAge(startMs: number | null | undefined, now: number = Date.now()): string | null {
    if (typeof startMs !== 'number' || !Number.isFinite(startMs))
        return null;

    return formatDuration(now - startMs);
}

/**
 * The feed sends place names in caps ("HOUSTON", "SPRING BRANCH"). Rendering
 * them raw makes the popup shout, so normalise to title case.
 */
export function toTitleCase(value: string | null | undefined): string | null {
    if (!value) return null;

    const trimmed = value.trim();
    if (trimmed.length === 0) return null;

    return trimmed
        .toLowerCase()
        .replace(/(^|[\s/-])([a-z])/g, (_, boundary: string, letter: string) => boundary + letter.toUpperCase());
}
