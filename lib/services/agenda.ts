import GetCalendar from "@/actions/GetCalendar";
import getCrousData from "@/actions/GetCrousData";
import { CalculateEatingTime } from "@/lib/utils/calendar-utils";
import { CalendarEventProps, tbk } from "@/lib/types";
import { failure, ServiceResult, success } from "./result";

/**
 * Lise timetable (public iCal feed) merged with the Crous menu of the TBK.
 * RU events are fitted into the lunch gaps, or dropped when there is none.
 */
export async function getAgenda(
	liseId: string,
	campus: tbk,
	includeRu: boolean
): Promise<ServiceResult<CalendarEventProps[]>> {
	const [calendar, meals] = await Promise.all([
		GetCalendar(liseId),
		includeRu ? getCrousData(campus) : Promise.resolve([]),
	]);

	if (calendar.status !== "success") {
		return failure("LISE_UNAVAILABLE", "Impossible de récupérer l'emploi du temps");
	}

	const events = CalculateEatingTime([...calendar.events, ...meals]).sort(
		(a, b) => a.startDate.getTime() - b.startDate.getTime()
	);
	return success(events);
}
