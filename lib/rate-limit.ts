const WINDOW_DURATION_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function getWhitelist(): Set<string> {
	const whitelistStr = process.env.IP_WHITELIST || "";
	return new Set(
		whitelistStr
			.split(",")
			.map((item) => item.trim())
			.filter(Boolean)
	);
}

/** In-memory fixed-window limiter for login attempts, keyed by IP. */
export function isRateLimited(ip: string, now: number = Date.now()): boolean {
	if (getWhitelist().has(ip)) {
		return false;
	}

	const record = rateLimitMap.get(ip);

	if (!record || now > record.resetAt) {
		rateLimitMap.set(ip, { count: 1, resetAt: now + WINDOW_DURATION_MS });
		return false;
	}

	if (record.count >= MAX_ATTEMPTS) {
		return true;
	}

	rateLimitMap.set(ip, { ...record, count: record.count + 1 });
	return false;
}

export function resetRateLimits() {
	rateLimitMap.clear();
}

export function getClientIp(forwardedFor: string | null): string {
	return forwardedFor ? forwardedFor.split(",")[0].trim() : "127.0.0.1";
}
