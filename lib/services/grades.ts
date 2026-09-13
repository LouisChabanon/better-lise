import prisma from "@/lib/db";
import logger from "@/lib/logger";
import PostHogClient from "@/lib/posthog-server";
import { GradeType, PromoCode, tbk } from "@/lib/types";
import { parseGradesTable } from "@/lib/parsers/grades";
import { notifyClassmates } from "@/actions/PushNotification";
import { failure, LiseCredentials, ServiceResult, success } from "./result";
import { LISE_MENUS, openLisePage } from "./lise-session";

type DbGrade = {
	id: number;
	code: string;
	name: string;
	grade: number;
	date: string;
	absence: string;
	comment: string;
	teachers: string;
	opened: boolean;
};

type DbUser = { id: number; username: string; class: string | null; tbk: string | null };

const toGradeType = (g: DbGrade): GradeType => ({
	code: g.code,
	libelle: g.name,
	note: g.grade,
	date: g.date,
	absence: g.absence,
	comment: g.comment,
	teachers: g.teachers,
	isNew: !g.opened,
});

export type GradeDiff = {
	toCreate: GradeType[];
	toUpdate: { id: number; note: number }[];
	idsToDelete: number[];
	removedCodes: string[];
	result: GradeType[];
};

/**
 * Reconciles scraped grades with DB grades: new codes are created, changed
 * notes updated (and flagged new), DB duplicates and grades gone from Lise removed.
 */
export function diffGrades(
	dbGrades: DbGrade[],
	scraped: GradeType[],
	isFirstSync: boolean
): GradeDiff {
	const scrapedCodes = new Set(scraped.map((g) => g.code));
	const toCreate: GradeType[] = [];
	const toUpdate: { id: number; note: number }[] = [];
	const idsToDelete: number[] = [];
	const updatedCodes = new Map<string, number>();

	for (const grade of scraped) {
		const matches = dbGrades.filter((db) => db.code === grade.code);
		if (matches.length === 0) {
			toCreate.push(grade);
			continue;
		}
		idsToDelete.push(...matches.slice(1).map((g) => g.id));
		if (matches[0].grade !== grade.note) {
			toUpdate.push({ id: matches[0].id, note: grade.note });
			updatedCodes.set(grade.code, grade.note);
		}
	}

	const duplicateIds = new Set(idsToDelete);
	const removed = dbGrades.filter((db) => !scrapedCodes.has(db.code));
	const removedCodes = [...new Set(removed.map((g) => g.code))];
	idsToDelete.push(...removed.map((g) => g.id));

	const existing = dbGrades
		.filter((db) => scrapedCodes.has(db.code) && !duplicateIds.has(db.id))
		.map(toGradeType)
		.map((g) =>
			updatedCodes.has(g.code)
				? { ...g, note: updatedCodes.get(g.code)!, isNew: true }
				: g
		);
	const created = toCreate.map((g) => ({ ...g, isNew: !isFirstSync }));

	return {
		toCreate,
		toUpdate,
		idsToDelete: [...new Set(idsToDelete)],
		removedCodes,
		result: [...existing, ...created],
	};
}

async function persistDiff(userId: number, diff: GradeDiff, isFirstSync: boolean) {
	await Promise.all([
		...diff.toUpdate.map((u) =>
			prisma.grade.update({
				where: { id: u.id, userId },
				data: { grade: u.note },
			})
		),
		diff.idsToDelete.length > 0
			? prisma.grade.deleteMany({ where: { id: { in: diff.idsToDelete } } })
			: Promise.resolve(),
		diff.toCreate.length > 0
			? prisma.grade.createMany({
					data: diff.toCreate.map((g) => ({
						name: g.libelle,
						code: g.code,
						grade: g.note,
						date: g.date,
						absence: g.absence,
						comment: g.comment,
						teachers: g.teachers,
						userId,
						opened: isFirstSync,
					})),
				})
			: Promise.resolve(),
	]);
}

async function maybeNotifyClassmates(user: DbUser, created: GradeType[]) {
	if (created.length === 0 || !user.class || !user.tbk || user.class === "Autre") {
		return;
	}
	const firstNew = created[0];
	const alreadyKnown = await prisma.grade.findFirst({
		where: { code: firstNew.code, userId: { not: user.id } },
		select: { id: true },
	});
	if (alreadyKnown) return;

	notifyClassmates(
		user.class as PromoCode,
		user.tbk as tbk,
		user.id,
		firstNew.code,
		firstNew.libelle
	).catch((e) => logger.error("Notification failed", { error: e }));
}

/**
 * Returns the user's grades. When `reload` is true (or no grades are cached),
 * scrapes Lise and synchronises the DB first.
 */
export async function syncGrades(
	credentials: LiseCredentials,
	reload: boolean
): Promise<ServiceResult<GradeType[]>> {
	const start = Date.now();
	const user = await prisma.user.findUnique({
		where: { username: credentials.username },
	});
	if (!user) {
		logger.error("GetGrades error: User missing in DB", {
			username: credentials.username,
		});
		return failure("NOT_FOUND", "User not found in database.");
	}

	const dbGrades = await prisma.grade.findMany({ where: { userId: user.id } });
	const isFirstSync = dbGrades.length === 0;

	if (!reload && !isFirstSync) {
		return success(dbGrades.map(toGradeType));
	}

	logger.info("Scraping grades started", { username: user.username, isFirstSync });
	const posthog = PostHogClient();

	try {
		const page = await openLisePage(credentials.jsessionId, LISE_MENUS.grades);
		if (!page.ok) {
			logger.warn("User session has expired on LISE", { username: user.username });
			return page;
		}

		const { grades: scraped, skippedRows } = parseGradesTable(page.data);
		if (skippedRows > 0) {
			logger.warn("Skipped malformed grade rows", { count: skippedRows });
		}

		const diff = diffGrades(dbGrades, scraped, isFirstSync);
		await persistDiff(user.id, diff, isFirstSync);
		if (!isFirstSync) await maybeNotifyClassmates(user, diff.toCreate);

		const duration = Date.now() - start;
		posthog?.capture({
			distinctId: user.username,
			event: "scraper_performance",
			properties: {
				endpoint: "grades",
				duration_ms: duration,
				is_new_data: diff.toCreate.length > 0,
				grade_count: diff.toCreate.length,
				removed_count: diff.removedCodes.length,
			},
		});
		await prisma.scraperLog
			.create({ data: { duration, endpoint: "grades", status: "success" } })
			.catch((e) => logger.error("Failed to log scraper status", { error: e }));

		logger.info("Scraping finished", {
			new: diff.toCreate.length,
			updated: diff.toUpdate.length,
			deleted: diff.idsToDelete.length,
		});

		return success(diff.result);
	} catch (error) {
		posthog?.capture({
			distinctId: user.username,
			event: "scraper_error",
			properties: { error: String(error) },
		});
		logger.error("Error fetching grades", {
			error: error instanceof Error ? error.message : String(error),
		});
		return failure("LISE_UNAVAILABLE", "Error fetching grades");
	} finally {
		await posthog?.shutdown();
	}
}
