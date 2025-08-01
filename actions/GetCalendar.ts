"use server";
import { cookies } from "next/headers";
const ical = require("node-ical");
import { json } from "stream/consumers";
import { CalendarEventProps } from "@/lib/types";
import { verifySession } from "@/lib/sessions";


const GetCalendar = async () => {

    const URI = "http://lise.ensam.eu/ical_apprenant/";
    const DEV_URI = process.env.DEV_URI || URI;
    
    const res = await verifySession();
    if (!res.isAuth || !res.username) {
        console.error("User is not authenticated or username is missing.");
        return null;
    }


    const username = res.username;

    try {
        const res = await fetch(`${URI}${username}`, {
            method: "GET",
            headers: {
                "cache-control": "no-cache"}
            },
        );

        if (!res.ok) {
            console.error("Failed to fetch calendar:", res.statusText);
            return null;
        }

        const data = await res.text();
        
        const calendarData = await ical.parseICS(data);

        const calendarEvents: CalendarEventProps[] = [];
        for (const key in calendarData) {
            if (calendarData.hasOwnProperty(key) && calendarData[key].type === 'VEVENT') {
                const event = calendarData[key];
                const startDate = new Date(event.start);
                const endDate = new Date(event.end);
                
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
                    type: type ? type[1].trim() : "CM" // Change this once we have actual data
                };

                calendarEvents.push(calendarEvent);
                
            }
        }

        return calendarEvents;


    } catch (error) {
        console.error("Error fetching calendar:", error);
        return null;
    }
}

export default GetCalendar;