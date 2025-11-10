"use client";

import { useQuery } from "@tanstack/react-query";
import GetCalendar from "@/actions/GetCalendar";
import getCrousData from "@/actions/GetCrousData";
import { CalculateOverlaps } from "@/lib/helper";
import { tbk } from "@/lib/types";

const getSettings = () => {
    if(typeof window === "undefined") {
        return { username: null, tbk: "Sibers" as tbk};
    }
    const username = localStorage.getItem("lise_id");
    const tbk =(localStorage.getItem("tbk") || "Sibers") as tbk;
    return { username, tbk }
};

export const useCalendarData = () => {

    const queryKey = ["calendar", getSettings().username, getSettings().tbk];

    return useQuery({
        queryKey: queryKey,
        queryFn: async () => {
            const {username, tbk} = getSettings();
            if(!username){
                return { events: [], mapping: {}, tbk, status: "no user"};
            }

            const calendarDataRes = await GetCalendar(username);
            const crousData = await getCrousData(tbk);

            if(calendarDataRes.status !== "success"){
                return { events: [], mapping: {}, tbk, status: calendarDataRes.status}
            }

            const eventData = calendarDataRes.events.concat(crousData || []);
            const {sorted, mapping} = CalculateOverlaps(eventData);

            return { events: sorted, mapping, tbk, status: "sucess"};
        }
    })
}