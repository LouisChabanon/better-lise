import { NextRequest } from "next/server";
import { fail, fromResult } from "@/lib/api/respond";
import { agendaQuerySchema, firstIssue } from "@/lib/api/validation";
import { getAgenda } from "@/lib/services/agenda";

// Public like the web agenda: Lise exposes the iCal feed by student id.
export async function GET(request: NextRequest) {
	const parsed = agendaQuerySchema.safeParse(
		Object.fromEntries(request.nextUrl.searchParams)
	);
	if (!parsed.success) {
		return fail("VALIDATION", firstIssue(parsed.error));
	}

	const { liseId, tbk, ru } = parsed.data;
	return fromResult(await getAgenda(liseId, tbk, ru), (events) => ({ events }));
}
