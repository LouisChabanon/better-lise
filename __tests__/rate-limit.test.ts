import { beforeEach, describe, expect, it } from "vitest";
import { getClientIp, isRateLimited, resetRateLimits } from "@/lib/rate-limit";

describe("rate limit", () => {
	beforeEach(() => {
		resetRateLimits();
		delete process.env.IP_WHITELIST;
	});

	it("allows 5 attempts per minute then blocks", () => {
		const now = 1_000_000;
		const results = Array.from({ length: 6 }, () => isRateLimited("1.2.3.4", now));
		expect(results).toEqual([false, false, false, false, false, true]);
	});

	it("resets after the window", () => {
		const now = 1_000_000;
		for (let i = 0; i < 6; i++) isRateLimited("1.2.3.4", now);
		expect(isRateLimited("1.2.3.4", now + 61_000)).toBe(false);
	});

	it("tracks IPs independently and honours the whitelist", () => {
		process.env.IP_WHITELIST = "9.9.9.9, 8.8.8.8";
		for (let i = 0; i < 10; i++) expect(isRateLimited("9.9.9.9")).toBe(false);
		for (let i = 0; i < 5; i++) isRateLimited("1.1.1.1");
		expect(isRateLimited("2.2.2.2")).toBe(false);
	});

	it("extracts the first forwarded IP", () => {
		expect(getClientIp("10.0.0.1, 172.16.0.1")).toBe("10.0.0.1");
		expect(getClientIp(null)).toBe("127.0.0.1");
	});
});
