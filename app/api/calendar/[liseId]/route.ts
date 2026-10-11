import { NextRequest, after } from "next/server";
import crousData from "@/crous_data.json";
import { buildIcsCalendar } from "@/lib/calendar/ics";
import { trackCalendarFeedFetch } from "@/lib/calendar/analytics";
import { getAgenda } from "@/lib/services/agenda";
import { liseIdChecker } from "@/lib/validators";
import { tbk } from "@/lib/types";
import logger from "@/lib/logger";

export const dynamic = "force-dynamic";

const CACHE_MAX_AGE_SECONDS = 900;

function isCrousTbk(value: string): value is tbk {
	return crousData.CrousData.some((item) => item.tbk === value);
}

function textError(message: string, status: number) {
	return new Response(message, {
		status,
		headers: { "Content-Type": "text/plain; charset=utf-8" },
	});
}

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ liseId: string }> },
) {
	const { liseId: rawId } = await params;
	const liseId = rawId.replace(/\.ics$/i, "");

	if (!liseIdChecker(liseId)) {
		return textError("Identifiant Lise invalide", 400);
	}

	const ru = request.nextUrl.searchParams.get("ru");
	if (ru !== null && !isCrousTbk(ru)) {
		return textError("Restaurant universitaire inconnu", 400);
	}

	const agenda = await getAgenda(liseId, ru ?? "Sibers", ru !== null);

	// Never answer an empty 200 when Lise is down: subscribed clients would
	// wipe every event until the next refresh.
	if (!agenda.ok) {
		logger.warn("Calendar feed unavailable, Lise fetch failed", {
			code: agenda.code,
		});
		return textError("Lise est indisponible, réessayez plus tard", 502);
	}

	const events = agenda.data;
	const body = buildIcsCalendar(events, { liseId });

	// Sent after the response so analytics never delay the calendar app
	const userAgent = request.headers.get("user-agent");
	after(() =>
		trackCalendarFeedFetch({
			liseId,
			userAgent,
			ruTbk: ru,
			eventCount: events.length,
		}),
	);

	return new Response(body, {
		status: 200,
		headers: {
			"Content-Type": "text/calendar; charset=utf-8",
			"Content-Disposition": 'inline; filename="better-lise.ics"',
			"Cache-Control": `public, max-age=${CACHE_MAX_AGE_SECONDS}`,
		},
	});
}
