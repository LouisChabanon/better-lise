export type HealthStatus = "unknown" | "ok" | "slow" | "very_slow";

export type HealthBucket = {
	/** Start of the hour (ISO 8601, UTC). */
	hour: string;
	/** Average duration of successful syncs in milliseconds, 0 without any. */
	avgDuration: number;
	count: number;
	failures: number;
};

export type ScraperLogSample = { createdAt: Date; duration: number; status: string };

export const HISTORY_HOURS = 24;
const HOUR_MS = 60 * 60 * 1000;
// Same thresholds as the web status badge (components/ui/LiseStatusBadge.tsx)
const MIN_SAMPLES = 4;
const SLOW_MS = 15_000;
const VERY_SLOW_MS = 20_000;

export function healthStatus(avgDuration: number, count: number): HealthStatus {
	if (count < MIN_SAMPLES) return "unknown";
	if (avgDuration > VERY_SLOW_MS) return "very_slow";
	if (avgDuration > SLOW_MS) return "slow";
	return "ok";
}

/** Groups scraper logs into hourly buckets, oldest first, the last one being the current hour. */
export function bucketScraperLogs(logs: ScraperLogSample[], now: Date): HealthBucket[] {
	const currentHour = Math.floor(now.getTime() / HOUR_MS) * HOUR_MS;
	const firstHour = currentHour - (HISTORY_HOURS - 1) * HOUR_MS;
	const totals = Array.from({ length: HISTORY_HOURS }, () => ({
		duration: 0,
		count: 0,
		failures: 0,
	}));

	for (const log of logs) {
		const index = Math.floor((log.createdAt.getTime() - firstHour) / HOUR_MS);
		if (index < 0 || index >= HISTORY_HOURS) continue;
		if (log.status === "success") {
			totals[index].duration += log.duration;
			totals[index].count += 1;
		} else {
			totals[index].failures += 1;
		}
	}

	return totals.map((t, i) => ({
		hour: new Date(firstHour + i * HOUR_MS).toISOString(),
		avgDuration: t.count === 0 ? 0 : Math.round(t.duration / t.count),
		count: t.count,
		failures: t.failures,
	}));
}
