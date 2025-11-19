"use server";
const ical = require("node-ical");
import { CalendarEventProps } from "@/lib/types";
import { fromZonedTime } from "date-fns-tz"
import logger from "@/lib/logger";
import { liseIdChecker } from "@/lib/helper";

const tz = 'Europe/Paris';

type CalendarDataResponse = {
    events: CalendarEventProps[];
    status: "no user" | "error" | "success";
}

const GetCalendar = async (username: string | null) => {

    const URI = "http://lise.ensam.eu/ical_apprenant/";
    const DEV_URI = process.env.DEV_URI || URI;
    
    if (!username) {
        return { events: [], status: "no user" } as CalendarDataResponse;
    }

    if (!liseIdChecker(username)){
        return { events: [], status: "error"}
    }

    try {
        logger.info("Fetching calendar data", {username});
        const res = await fetch(`${URI}${username}`, {
            method: "GET",
            headers: {
                "cache-control": "no-cache"}
            },
        );

        if (!res.ok) {
            logger.error("Failed to fetch calendar data from LISE", {username: username, liseResponse: res.statusText});
            return { events: [], status: "error" } as CalendarDataResponse;
        }

        const data = await res.text();
        logger.info("Calendar data fetched successfully", {username});
        const calendarData = await ical.parseICS(data);

        const calendarEvents: CalendarEventProps[] = [];
        for (const key in calendarData) {
            if (calendarData.hasOwnProperty(key) && calendarData[key].type === 'VEVENT') {
                const event = calendarData[key];
                const startDate = fromZonedTime(event.start, tz)
                const endDate = fromZonedTime(event.end, tz)

                const durationInMs = endDate.getTime() - startDate.getTime();

                const isAllDay = durationInMs > 28800000;
                //console.log("import Data", "Event Start:", startDate, "End:", endDate);

                // Check if the event has a summary
                const summary = event.summary || "No summary available";

                const module = event.description.match(/- MODULES\s*:\s*(.+)/);
                const group = event.description.match(/- GROUPES\s*:\s*(.+)/);
                const teacher = event.description.match(/- INTERVENANTS\s*:\s*(.+)/);
                const room = event.location || "No room specified";
                const type = event.description.match(/- TYPE_ACTIVITE\s*:\s*(.+)/);

                // Create a CalendarEventProps object
                const calendarEvent: CalendarEventProps = {
                    title: module ? module[1].trim() : summary,
                    startDate: startDate,
                    endDate: endDate,
                    room: room,
                    teacher: teacher ? teacher[1].trim() : "No teacher specified",
                    group: group ? group[1].trim() : "No group specified",
                    type: type ? type[1].trim() : "CM", // Change this once we have actual data
                    isAllDay: isAllDay
                };

                calendarEvents.push(calendarEvent);
                
            }
        }

        return { events: calendarEvents, status: "success" } as CalendarDataResponse;


    } catch (error) {
        logger.error("Error fetching calendar data", {username, 
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
        });
        return { events: [], status: "error" } as CalendarDataResponse;
    }
}

export default GetCalendar;