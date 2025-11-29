"use client";

import { useQuery } from "@tanstack/react-query";
import GetCalendar from "@/actions/GetCalendar";
import getCrousData from "@/actions/GetCrousData";
import { CalculateOverlaps } from "@/lib/utils/calendar-utils";
import { CalendarEventProps, tbk } from "@/lib/types";

const getSettings = () => {
	if (typeof window === "undefined") {
		return { username: null, tbk: "Sibers" as tbk };
	}
	const username = localStorage.getItem("lise_id");
	const tbk = (localStorage.getItem("tbk") || "Sibers") as tbk;
	const display_ru_menu = localStorage.getItem("display_ru_menu") === "true";
	return { username, tbk, display_ru_menu };
};

export const useCalendarData = () => {
	const queryKey = [
		"calendar",
		getSettings().username,
		getSettings().tbk,
		getSettings().display_ru_menu,
	];

	return useQuery({
		queryKey: queryKey,
		queryFn: async () => {
			const { username, tbk, display_ru_menu } = getSettings();
			if (!username) {
				return { events: [], mapping: {}, tbk, status: "no user" };
			}

			const calendarDataRes = await GetCalendar(username);
			let crousData: CalendarEventProps[] | undefined = undefined;

			if (display_ru_menu) {
				crousData = await getCrousData(tbk);
			}

			if (calendarDataRes.status !== "success") {
				return { events: [], mapping: {}, tbk, status: calendarDataRes.status };
			}

			const mainEvents: CalendarEventProps[] = calendarDataRes.events;
			const mealEvents: CalendarEventProps[] = crousData || [];

			const eventData = mainEvents.concat(mealEvents);
			const { sorted, mapping } = CalculateOverlaps(eventData);

			return { events: sorted, mapping, tbk, status: "sucess" };
		},
	});
};
