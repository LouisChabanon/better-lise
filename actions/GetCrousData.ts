"use server";
import * as cheerio from "cheerio";
import { CalendarEventProps, tbk } from "@/lib/types";
import { fromZonedTime } from "date-fns-tz";
import crousData from "@/crous_data.json";
import logger from "@/lib/logger";

const tz = "Europe/Paris";

const Months: Record<string, number> = {
	janvier: 0,
	février: 1,
	mars: 2,
	avril: 3,
	mai: 4,
	juin: 5,
	juillet: 6,
	août: 7,
	septembre: 8,
	octobre: 9,
	novembre: 10,
	décembre: 11,
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
		logger.info("Fetching Crous data", { tbk });
		const crousURL = crousData.CrousData.find((item) => item.tbk === tbk)?.url;
		if (!crousURL) {
			logger.warn("No Crous URL provided for tbk", { tbk });
			return;
		}
		const res = await fetch(crousURL);
		if (!res.ok) {
			logger.warn("Failed to fetch Crous data", {
				tbk,
				crousStatus: res.status,
			});
			return;
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
					if (mainItem !== "ENTREES" && mainItem !== "DESSERTS") {
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
					.map((item) => `${item.ilot.name}\n${item.ilot.food.join(", ")}`)
					.join(`\n\n`);

				mealEvents.push({
					title: "RU",
					type: "RU",
					summary,
					startDate: localeStartDate,
					endDate: localeEndDate,
					isAllDay: false,
				});
			}
		});
	} catch (error) {
		logger.error("Failed to fetch crous data", {
			tbk,
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
		});
	}

	return mealEvents;
}
