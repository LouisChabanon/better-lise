"use server";
import fetchCookie from "fetch-cookie";
import { CookieJar } from "tough-cookie";
import { verifySession, deleteSession } from "@/lib/sessions";
import * as cheerio from "cheerio";
import { AbsenceType, AbsencesRequestState } from "@/lib/types";
import { getHiddenFields, navigateToLisePage } from "@/lib/utils/scraper-utils";
import logger from "@/lib/logger";
import course_weights from "@/ue_data.json";

const LISE_URI = process.env.LISE_URI || "https://lise.ensam.eu";

type CourseWeight = (typeof course_weights.course_weights)[number];

const parseDurationToHours = (durationStr: string): number => {
	if (!durationStr) return 0;

	const str = durationStr.toLowerCase().replace(/\s/g, "");

	const [hoursStr, minutesStr] = str.split(":");
	const hours = parseInt(hoursStr, 10) || 0;
	const minutes = parseInt(minutesStr, 10) || 0;
	return hours + minutes / 60;
};

const normalize = (str: string) =>
	str
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase();

export async function getAbsenceData(
	reload: boolean = true
): Promise<AbsencesRequestState> {
	const absences: AbsenceType[] = [];

	const session = await verifySession();
	if (!session.username) {
		logger.warn("User has no active session, failed to fetch absences");
		return { errors: "No username found in session.", success: false };
	}

	const jsessionid = session.sessionId;

	if (!jsessionid) {
		console.error("No Lise session Id found in cookie");
		return { errors: "Session id not found.", success: false };
	}

	if (reload === true) {
		logger.info("Fetching absences from Lise", { username: session.username });

		const jar = new CookieJar();

		const fetchWithCookies = fetchCookie(fetch, jar);
		jar.setCookieSync(`JSESSIONID=${jsessionid}`, LISE_URI);

		try {
			const res = await fetchWithCookies(LISE_URI);
			const html = await res.text();
			const $html = cheerio.load(html);

			if (
				$html("title").text().includes("Connectez-vous") ||
				$html("title").text().includes("Sign in")
			) {
				logger.error("User session has expired on LISE", {
					username: session.username,
				});
				await deleteSession();
				return { errors: "Session has expired", success: false };
			}

			const hiddenFields = getHiddenFields($html);

			const $table_html = await navigateToLisePage(
				hiddenFields,
				{ submenuId: "submenu_47054", buttonId: "1_0" },
				jar
			);
			const nbrTotalAbs =
				$table_html("#form\\:nbrAbs").text() != ""
					? parseInt($table_html("#form\\:nbrAbs").text())
					: 0;
			const dureeTotalAbs =
				$table_html("#form\\:dureeAbs").text() != ""
					? $table_html("#form\\:dureeAbs").text()
					: "00h00";

			const rows = $table_html("#form\\:table_data > tr");
			const hoursMap: Record<string, { totalHours: number; name: string }> = {};

			rows.each((index, element) => {
				const cells = $table_html(element).find("td");

				const rowData: AbsenceType = {
					date: $table_html(cells.eq(0)).clone().text().trim(),
					motif: $table_html(cells.eq(1)).clone().text().trim(),
					duree: $table_html(cells.eq(2)).clone().text().trim(),
					horaire: $table_html(cells.eq(3)).clone().text().trim(),
					cours: $table_html(cells.eq(4)).clone().text().trim(),
					intervenants: $table_html(cells.eq(5)).clone().text().trim(),
					matiere: $table_html(cells.eq(6)).clone().text().trim(),
				};
				absences.push(rowData);

				if (rowData.date !== "Aucune absence.") {
					// This matching function is a nightmare and has many edge cases
					// So I implemented a scoring mechanism to reward lenght of keyword and number of keywords
					const rowNormalized = normalize(rowData.cours);
					const potentialMatches = course_weights.course_weights.filter((c) =>
						rowData.cours.includes(c.Semester)
					);

					const bestMatch = potentialMatches.reduce<CourseWeight | null>(
						(best, current) => {
							let currentScore = 0;
							let matchCount = 0;

							current.Keywords.forEach((k) => {
								if (rowNormalized.includes(normalize(k))) {
									// Keyword match = reward
									currentScore += 10; // +10pt for matched keywords
									currentScore += k.length; // +1p for keyword lenght (I'll try this for now but I'm not sure)
									matchCount++;
								} else {
									// Keyword miss = malus
									currentScore -= 5;
								}
							});

							if (matchCount === 0) return best;

							let bestScore = -Infinity;
							if (best) {
								bestScore = 0;
								best.Keywords.forEach((k) => {
									if (rowNormalized.includes(normalize(k))) {
										bestScore += 10;
										bestScore += k.length;
									} else {
										bestScore -= 5;
									}
								});
							}
							return currentScore > bestScore ? current : best;
						},
						null
					);

					if (bestMatch) {
						const matchedCode = bestMatch.Code;
						// Check for unjustified absences
						if (!rowData.motif) {
							const hours = parseDurationToHours(rowData.duree);
							if (!hoursMap[matchedCode]) {
								hoursMap[matchedCode] = {
									totalHours: 0,
									name: rowData.matiere,
								};
							}
							hoursMap[matchedCode].totalHours += hours;
						}
					}
				}
			});

			const stats = Object.keys(hoursMap)
				.map((code) => {
					const ref = course_weights.course_weights.find(
						(c) => c.Code === code
					);
					if (!ref) return null;
					const accumulated = hoursMap[code];

					return {
						code: code,
						name: accumulated.name,
						absentHours: accumulated.totalHours,
						totalUE: ref.FFP,
						percentage: (accumulated.totalHours / ref.FFP) * 100,
					};
				})
				.filter((item) => item !== null)
				.sort((a, b) => (b?.percentage || 0) - (a?.percentage || 0));

			logger.info("Sucessfully fetched absences", {
				user: session.username,
				nbrTotalAbs,
				dureeTotalAbs,
			});

			if (absences.length > 0 && absences[0].date === "Aucune absence.") {
				return {
					success: true,
					data: {
						nbTotalAbsences: nbrTotalAbs,
						dureeTotaleAbsences: dureeTotalAbs,
					},
				};
			}
			return {
				success: true,
				data: {
					nbTotalAbsences: nbrTotalAbs,
					dureeTotaleAbsences: dureeTotalAbs,
					absences,
					stats,
				},
			};
		} catch (error) {
			logger.error("Error fetching absences: ", {
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
			});
			return { errors: "Error fetch absences", success: false };
		}
	}
	return { errors: "Feature is not ready yet", success: false };
}
