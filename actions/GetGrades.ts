"use server";
import fetchCookie from "fetch-cookie";
import { CookieJar } from "tough-cookie";
import prisma from "@/lib/db";
import { verifySession, deleteSession } from "@/lib/sessions";
import * as cheerio from "cheerio";
import { getHiddenFields, navigateToLisePage } from "@/lib/utils/scraper-utils";
import { GradeType, PromoCode, RequestState, tbk } from "@/lib/types";
import logger from "@/lib/logger";
import PostHogClient from "@/lib/posthog-server";
import { notifyClassmates } from "./PushNotification";

const LISE_URI = process.env.LISE_URI || "https://lise.ensam.eu";

export async function getGradeData(
	reload: boolean = true
): Promise<RequestState> {
	const isMock = process.env.MOCK_DATA === "true";
	const start = Date.now();
	const posthog = PostHogClient();

	const session = await verifySession();
	if (!session.username) {
		logger.warn("GetGrades blocked: No active session");
		return { errors: "No username found in session.", success: false };
	}

	const user = await prisma.user.findUnique({
		where: { username: session.username },
	});
	if (!user) {
		logger.error("GetGrades error: User missing in DB", {
			username: session.username,
		});
		return { errors: "User not found in database.", success: false };
	}

	const jsessionid = session.sessionId;
	if (!jsessionid) {
		logger.warn("No LISE session Id found in cookies", {
			username: session.username,
		});
		return { errors: "Session id not found.", success: false };
	}

	const db_grades = await prisma.grade.findMany({ where: { userId: user.id } });
	const isFirstSync = db_grades.length === 0;

	const mappedDbGrades: GradeType[] = db_grades.map((g) => ({
		code: g.code,
		libelle: g.name,
		note: g.grade,
		date: g.date,
		absence: g.absence,
		comment: g.comment,
		teachers: g.teachers,
		isNew: !g.opened,
	}));

	// If no reload needed, return early
	if (reload === false && db_grades.length > 0) {
		return { data: mappedDbGrades, success: true };
	}

	// Scrape Lise
	logger.info("Scraping grades started", {
		username: user.username,
		isFirstSync: isFirstSync,
	});

	const jar = new CookieJar();
	const fetchWithCookies = fetchCookie(fetch, jar);
	jar.setCookieSync(`JSESSIONID=${jsessionid}`, LISE_URI);

	let scrapedGrades: GradeType[] = [];

	try {
		const res = await fetchWithCookies(LISE_URI);
		const html = await res.text();
		const $html = cheerio.load(html);

		if (
			$html("title").text().includes("Connectez-vous") ||
			$html("title").text().includes("Sign in")
		) {
			logger.warn("User session has expired on LISE", {
				username: user.username,
			});
			await deleteSession();
			return { errors: "Session has expired", success: false };
		}

		const hiddenFields = getHiddenFields($html);
		const $table_html = await navigateToLisePage(
			hiddenFields,
			{ submenuId: "submenu_47356", buttonId: "4_0" },
			jar
		);

		const rows = $table_html("#form\\:dataTableFavori_data > tr");

		// Processing rows
		rows.each((index, element) => {
			const cells = $table_html(element).find("td");

			// Helper to clean text
			const clean = (idx: number) =>
				$table_html(cells.eq(idx))
					.clone()
					.find("ui-column-title")
					.remove()
					.end()
					.text()
					.trim();

			const rowData: GradeType = {
				date: clean(0),
				code: clean(1),
				libelle: clean(2),
				note: parseFloat(clean(3).replace(",", ".")), // Handle French locale commas
				absence: clean(4),
				comment: clean(5),
				teachers: clean(6),
			};

			// Validation
			if (
				rowData.date &&
				rowData.code &&
				rowData.libelle &&
				!isNaN(rowData.note)
			) {
				scrapedGrades.push(rowData);
			} else {
				logger.warn(`Skipping malformed row index ${index}`);
			}
		});

		const gradesToCreate: any[] = [];
		const updatePromises: Promise<any>[] = [];
		const deletePromises: Promise<any>[] = [];

		for (const scraped of scrapedGrades) {
			// Find all matches in DB (to detect duplicates in DB)
			const dbMatches = db_grades.filter((db) => db.code === scraped.code);

			if (dbMatches.length === 0) {
				// CASE: NEW GRADE
				gradesToCreate.push({
					name: scraped.libelle,
					code: scraped.code,
					grade: scraped.note,
					date: scraped.date,
					absence: scraped.absence,
					comment: scraped.comment,
					teachers: scraped.teachers,
					userId: user.id,
					opened: isFirstSync,
				});

				// Update local state for return
				mappedDbGrades.push({ ...scraped, isNew: !isFirstSync });
			} else {
				// CASE: EXISTING GRADE (Check for modification or DB duplicates)
				const primaryMatch = dbMatches[0];

				// Handle DB Duplicates: If we have more than 1 entry for this code, delete the extras
				if (dbMatches.length > 1) {
					const idsToDelete = dbMatches.slice(1).map((g) => g.id);
					deletePromises.push(
						prisma.grade.deleteMany({
							where: { id: { in: idsToDelete } },
						})
					);
				}

				// 2. Handle Modification
				if (primaryMatch.grade !== scraped.note) {
					updatePromises.push(
						prisma.grade.update({
							where: { id: primaryMatch.id, userId: user.id },
							data: { grade: scraped.note },
						})
					);

					// Update local state
					const localIdx = mappedDbGrades.findIndex(
						(m) => m.code === scraped.code
					);
					if (localIdx !== -1) {
						mappedDbGrades[localIdx].note = scraped.note;
						mappedDbGrades[localIdx].isNew = true;
					}
				}
			}
		}

		// Execute DB Operations
		await Promise.all([
			...updatePromises,
			...deletePromises,
			gradesToCreate.length > 0
				? prisma.grade.createMany({ data: gradesToCreate })
				: Promise.resolve(),
		]);

		// Handle Notifications
		if (
			gradesToCreate.length > 0 &&
			!isFirstSync &&
			user.class &&
			user.tbk &&
			user.class !== "Autre"
		) {
			const firstNew = gradesToCreate[0];

			// Check if someone else has this grade code already
			const gradeAlreadyExistsGlobally = await prisma.grade.findFirst({
				where: {
					code: firstNew.code,
					userId: { not: user.id }, // Check other users
				},
				select: { id: true },
			});

			if (!gradeAlreadyExistsGlobally) {
				notifyClassmates(
					user.class as PromoCode,
					user.tbk as tbk,
					user.id,
					firstNew.code,
					firstNew.name
				).catch((e) => logger.error("Notification failed", { error: e }));
			}
		}

		// Telemetry & Logging
		const duration = Date.now() - start;
		posthog.capture({
			distinctId: user.username,
			event: "scraper_performance",
			properties: {
				endpoint: "grades",
				duration_ms: duration,
				is_new_data: gradesToCreate.length > 0,
				grade_count: gradesToCreate.length,
			},
		});

		await prisma.scraperLog
			.create({
				data: {
					duration: duration,
					endpoint: "grades",
					status: "success",
				},
			})
			.catch((e) => logger.error("Failed to log scraper status", { error: e }));

		logger.info("Scraping finished", {
			new: gradesToCreate.length,
			updated: updatePromises.length,
			deleted_dupes: deletePromises.length,
		});
	} catch (error) {
		posthog.capture({
			distinctId: user.username || "unknown",
			event: "scraper_error",
			properties: { error: String(error) },
		});
		logger.error("Error fetching grades", { error: error });
		return { errors: "Error fetching grades", success: false };
	} finally {
		await posthog.shutdown();
	}

	return { data: mappedDbGrades, success: true };
}
