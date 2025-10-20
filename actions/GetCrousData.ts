"use server";
import * as cheerio from "cheerio";
import { CalendarEventProps, tbk } from "@/lib/types";
import { fromZonedTime } from "date-fns-tz";
import crousData from "@/crous_data.json";

// Ignore TLS errors (expired certificate on crous-lorraine.fr)
// This fix is temporary and should be removed when the certificate is renewed

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

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
    "décembre": 11,
};

type Meal = {
    ilot: {
        name: string;
        food: string[];
    };
};

export default async function getCrousData(tbk: tbk) {
    const mealEvents: CalendarEventProps[] = [];

    try {
        console.log("Fetching Crous data for tbk:", tbk);
        const crousURL = crousData.CrousData.find(item => item.tbk === tbk)?.url;
        console.log("Crous URL:", crousURL);
        if (!crousURL) {
            return;
        }
        const res = await fetch(crousURL);
        if (!res.ok) {
            throw new Error("Failed to fetch Crous data");
        }
        const text = await res.text();
        const $ = cheerio.load(text);

        const menuItems = $(".menu");

        menuItems.each((i, menuEl) => {
            const dateText = $(menuEl)
                .find(".menu_date_title")
                .text()
                .trim()
                .split(" ");

            const date = new Date(
                Number(dateText[dateText.length - 1]),
                Months[dateText[dateText.length - 2]],
                Number(dateText[dateText.length - 3])
            );

            let foodSummary: Meal[] = [];

            // Collect all ilots + food
            $(menuEl)
                .find(".meal_foodies > li")
                .each((j, foodItem) => {
                    const mainItem = $(foodItem).contents().first().text().trim();
                    const subItems: string[] = [];
                    $(foodItem)
                        .find("ul > li")
                        .each((k, subItem) => {
                            subItems.push($(subItem).text().trim());
                        });
                    if (mainItem !== "ENTREES" && mainItem !== "DESSERTS"){
                    foodSummary.push({
                        ilot: {
                            name: mainItem,
                            food: subItems,
                        },
                    });
                }
            });

            // Create only ONE event per day
            if (foodSummary.length > 0) {
                const startDate = new Date(date);
                startDate.setHours(11, 30, 0, 0);
                const localeStartDate = fromZonedTime(startDate, tz);

                const endDate = new Date(date);
                endDate.setHours(13, 30, 0, 0);
                const localeEndDate = fromZonedTime(endDate, tz);

                const summary = foodSummary
                    .map(
                        (item) =>
                            `${item.ilot.name}\n${item.ilot.food.join(", ")}`
                    )
                    .join(`\n\n`);

                mealEvents.push({
                    title: "RU",
                    type: "RU",
                    summary,
                    startDate: localeStartDate,
                    endDate: localeEndDate,
                    priority: "low",
                });
            }
        });
    } catch (err) {
        console.error(err);
    }

    return mealEvents;
}
