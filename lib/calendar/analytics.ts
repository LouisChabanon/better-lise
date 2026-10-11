import "server-only";
import { createHmac } from "crypto";
import PostHogClient from "@/lib/posthog-server";
import logger from "@/lib/logger";

export type CalendarClient =
	"google" | "apple" | "outlook" | "thunderbird" | "browser" | "other";

type FeedFetch = {
	liseId: string;
	userAgent: string | null;
	ruTbk: string | null;
	eventCount: number;
};

// Calendar apps poll the feed (Apple hourly, Google ~every 12-24h). Recording
// every poll would burn the PostHog quota, so we keep one event per
// subscriber/client per day: "unique users over 7 days" = active subscribers.
let dedupeDay = "";
const seenToday = new Set<string>();

export function detectCalendarClient(userAgent: string | null): CalendarClient {
	if (!userAgent) return "other";
	if (/Google-Calendar-Importer/i.test(userAgent)) return "google";
	if (/CalendarAgent|dataaccessd|iCal\/|\b(macOS|iOS)\//.test(userAgent))
		return "apple";
	if (/Microsoft|Outlook|Exchange/i.test(userAgent)) return "outlook";
	if (/Thunderbird/i.test(userAgent)) return "thunderbird";
	if (/Mozilla/i.test(userAgent)) return "browser";
	return "other";
}


function subscriberId(liseId: string, secret: string): string {
	return `calfeed_${createHmac("sha256", secret).update(liseId).digest("hex").slice(0, 32)}`;
}

function isFirstFetchToday(key: string): boolean {
	const today = new Date().toISOString().slice(0, 10);
	if (today !== dedupeDay) {
		dedupeDay = today;
		seenToday.clear();
	}
	if (seenToday.has(key)) return false;
	seenToday.add(key);
	return true;
}

export async function trackCalendarFeedFetch(fetch: FeedFetch): Promise<void> {
	const secret = process.env.JWT_SECRET;
	if (!secret) return;

	const client = detectCalendarClient(fetch.userAgent);
	const distinctId = subscriberId(fetch.liseId, secret);
	if (!isFirstFetchToday(`${distinctId}:${client}`)) return;

	const posthog = PostHogClient();
	if (!posthog) return;

	try {
		posthog.capture({
			distinctId,
			event: "calendar_feed_fetched",
			properties: {
				client,
				include_ru: fetch.ruTbk !== null,
				tbk: fetch.ruTbk,
				event_count: fetch.eventCount,
				$process_person_profile: false,
			},
		});
		await posthog.shutdown();
	} catch (error) {
		logger.warn("Failed to send calendar feed analytics", {
			error: error instanceof Error ? error.message : String(error),
		});
	}
}
