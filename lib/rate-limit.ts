type Window = { count: number; resetAt: number };

const IP_WINDOW_MS = 60 * 1000;
const IP_MAX_ATTEMPTS = 5;

// X-Forwarded-For can be spoofed, so accounts get their own limit as well
const ACCOUNT_WINDOW_MS = 15 * 60 * 1000;
const ACCOUNT_MAX_ATTEMPTS = 10;

const ipAttempts = new Map<string, Window>();
const accountAttempts = new Map<string, Window>();

function getWhitelist(): Set<string> {
	const whitelistStr = process.env.IP_WHITELIST || "";
	return new Set(
		whitelistStr
			.split(",")
			.map((item) => item.trim())
			.filter(Boolean)
	);
}

/** Fixed-window counter: records an attempt and reports whether the limit is exceeded. */
function hitWindow(
	store: Map<string, Window>,
	key: string,
	windowMs: number,
	maxAttempts: number,
	now: number
): boolean {
	const record = store.get(key);

	if (!record || now > record.resetAt) {
		store.set(key, { count: 1, resetAt: now + windowMs });
		return false;
	}

	if (record.count >= maxAttempts) {
		return true;
	}

	store.set(key, { ...record, count: record.count + 1 });
	return false;
}

/** In-memory login limiter keyed by client IP. */
export function isRateLimited(ip: string, now: number = Date.now()): boolean {
	if (getWhitelist().has(ip)) {
		return false;
	}
	return hitWindow(ipAttempts, ip, IP_WINDOW_MS, IP_MAX_ATTEMPTS, now);
}

/** In-memory login limiter keyed by Lise username. */
export function isAccountRateLimited(
	username: string,
	now: number = Date.now()
): boolean {
	return hitWindow(
		accountAttempts,
		username,
		ACCOUNT_WINDOW_MS,
		ACCOUNT_MAX_ATTEMPTS,
		now
	);
}

export function resetRateLimits() {
	ipAttempts.clear();
	accountAttempts.clear();
}

export function getClientIp(forwardedFor: string | null): string {
	return forwardedFor ? forwardedFor.split(",")[0].trim() : "127.0.0.1";
}
