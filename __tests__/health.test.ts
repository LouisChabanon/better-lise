import { describe, expect, it } from "vitest";
import { bucketScraperLogs, healthStatus, HISTORY_HOURS } from "@/lib/services/health";

describe("healthStatus", () => {
	it("needs enough samples, then grades the average duration", () => {
		expect(healthStatus(30_000, 3)).toBe("unknown");
		expect(healthStatus(15_000, 4)).toBe("ok");
		expect(healthStatus(15_001, 4)).toBe("slow");
		expect(healthStatus(20_001, 4)).toBe("very_slow");
	});
});

describe("bucketScraperLogs", () => {
	const now = new Date("2025-03-10T10:30:00Z");
	const at = (iso: string, duration: number, status = "success") => ({ createdAt: new Date(iso), duration, status });

	it("returns 24 hourly buckets ending with the current hour", () => {
		const buckets = bucketScraperLogs([], now);
		expect(buckets).toHaveLength(HISTORY_HOURS);
		expect(buckets[0].hour).toBe("2025-03-09T11:00:00.000Z");
		expect(buckets[HISTORY_HOURS - 1]).toEqual({ hour: "2025-03-10T10:00:00.000Z", avgDuration: 0, count: 0, failures: 0 });
	});

	it("averages successes, counts failures and ignores logs outside the window", () => {
		const buckets = bucketScraperLogs(
			[
				at("2025-03-10T10:05:00Z", 1000),
				at("2025-03-10T10:25:00Z", 2001),
				at("2025-03-10T10:10:00Z", 9000, "error"),
				at("2025-03-09T11:00:00Z", 4000),
				at("2025-03-09T10:59:59Z", 5000),
			],
			now
		);
		expect(buckets[HISTORY_HOURS - 1]).toMatchObject({ avgDuration: 1501, count: 2, failures: 1 });
		expect(buckets[0]).toMatchObject({ avgDuration: 4000, count: 1, failures: 0 });
		expect(buckets.reduce((sum, b) => sum + b.count, 0)).toBe(3);
	});
});
