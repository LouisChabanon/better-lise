"use server";
import * as cheerio from "cheerio";
import { CalendarEventProps } from "@/lib/types";
import { fromZonedTime } from "date-fns-tz";

const tz = "Europe/Paris";

const Months: Record<string, number> = {
    "janvier": 0,
    "février": 1,
    "mars": 2,
    "avril": 3,
    "mai": 4,
    "juin": 5,
    "juillet": 6,
    "août": 7,
    "septembre": 8,
    "octobre": 9,
    "novembre": 10,
    "décembre": 11
}


export default async function getCrousData() {
    
    const mealEvents: CalendarEventProps[] = [];

    try {

        const res = await fetch("https://www.crous-lorraine.fr/restaurant/resto-u-metzin-2/");
        if (!res.ok) {
            throw new Error("Failed to fetch Crous data");
        }
        const text = await res.text();
        const $ = cheerio.load(text);

        const menuItems = $(".menu");

        menuItems.each((i, menuEl) => {
            const dateText = $(menuEl).find(".menu_date_title").text().trim().split(" ");
            
            const date = new Date(Number(dateText[dateText.length - 1]), Months[dateText[dateText.length - 2]], Number(dateText[dateText.length - 3]))

            const food = $(menuEl).find(".meal_foodies > li").each((j, foodItem) => {
                const mainItem = $(foodItem).contents().first().text().trim();
                const subItems: string[] = []
                $(foodItem).find(" ul > li ").each((k, subItem) => {
                    subItems.push($(subItem).text().trim());
                });
                
                // Make the event start at 11h30 and end at 13h30 Paris time
                const startDate = new Date(date);
                startDate.setHours(11, 30, 0, 0);
                const localeStartDate = fromZonedTime(startDate, tz);
                const endDate = new Date(date);
                endDate.setHours(13, 30, 0, 0);
                const localeEndDate = fromZonedTime(endDate, tz);

                console.log("Crous server: ", localeStartDate);

                if (subItems.length > 0){
                    mealEvents.push({
                        title: "Déjeuner RU",
                        type: "RU",
                        summary: `${mainItem} - ${subItems.join(", ")}`,
                        startDate: localeStartDate,
                        endDate: localeEndDate
                    });
                }
            })
        })

        return mealEvents;
    } catch (error) {
        console.error("Error fetching Crous data:", error);
        return null
    }
} 