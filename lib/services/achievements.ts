import prisma from "@/lib/db";
import logger from "@/lib/logger";
import PostHogClient from "@/lib/posthog-server";
import {
	ACHIEVEMENTS,
	AchievementIcon,
	AchievementRarity,
} from "@/lib/achievements";
import { failure, ServiceResult, success } from "./result";

type EvaluatedGrade = { code: string; name: string; grade: number };

export type AchievementFacts = {
	grades: EvaluatedGrade[];
	currentStreak: number;
};

export type AchievementItem = {
	code: string;
	/** "???" while a secret achievement is locked. */
	title: string;
	description: string | null;
	snark: string | null;
	icon: AchievementIcon | null;
	rarity: AchievementRarity;
	isSecret: boolean;
	unlockedAt: string | null;
};

export type AchievementsPayload = {
	achievements: AchievementItem[];
	/** Codes unlocked by this call, in definition order. */
	newlyUnlocked: string[];
};

const PILLIER = "PILLIER";
const STREAK_TIERS: [number, string][] = [
	[5, "STREAK_5"],
	[10, "STREAK_10"],
	[30, "STREAK_30"],
	[300, "STREAK_300"],
];

const isReval = (g: EvaluatedGrade) => {
	const name = g.name.toLowerCase();
	return name.includes("reval") || name.includes("rattrapage");
};

const isEnglish = (g: EvaluatedGrade) => {
	const name = g.name.toLowerCase();
	return name.includes("anglais") || name.includes("lv1") || g.code.includes("LV1");
};

/** Returns the achievement codes the facts unlock that are not in `existingCodes`. */
export function evaluateAchievements(
	facts: AchievementFacts,
	existingCodes: ReadonlySet<string>
): string[] {
	const earned = new Set<string>(["FIRST_LOGIN"]);
	const { grades, currentStreak } = facts;

	if (grades.some((g) => g.grade === 20)) earned.add("ACADEMIC_GOAT");
	if (grades.some((g) => g.grade === 0)) earned.add("WORST_CASE_SCENARIO");
	if (grades.some((g) => g.grade === 10)) earned.add("SUR_FIL");

	const revals = grades.filter(isReval);
	if (revals.length > 0) {
		earned.add("REVAL");
		if (revals.some((g) => g.grade < 10)) earned.add("SACQUE");
		if (revals.some((g) => g.grade === 10)) earned.add("CLUTCH");
		if (revals.some(isEnglish)) earned.add("SPEAK_ENGLISH");
	}

	if (grades.some((g) => g.code.includes("MATA") && g.grade >= 18)) {
		earned.add("DIEU_MATA");
	}

	for (const [days, code] of STREAK_TIERS) {
		if (currentStreak >= days) earned.add(code);
	}

	const owned = new Set([...existingCodes, ...earned]);
	if (ACHIEVEMENTS.every((a) => a.code === PILLIER || owned.has(a.code))) {
		earned.add(PILLIER);
	}

	return ACHIEVEMENTS.map((a) => a.code).filter(
		(code) => earned.has(code) && !existingCodes.has(code)
	);
}

/** Builds the API list; locked secrets are masked so the API never spoils them. */
export function toAchievementItems(unlocked: Map<string, Date>): AchievementItem[] {
	return ACHIEVEMENTS.map((a) => {
		const unlockedAt = unlocked.get(a.code) ?? null;
		const isMasked = Boolean(a.isSecret) && unlockedAt === null;
		return {
			code: a.code,
			title: isMasked ? "???" : a.title,
			description: isMasked ? null : a.description,
			snark: isMasked ? null : a.snark || null,
			icon: isMasked ? null : a.icon,
			rarity: a.rarity,
			isSecret: Boolean(a.isSecret),
			unlockedAt: unlockedAt?.toISOString() ?? null,
		};
	});
}

async function captureUnlocks(username: string, codes: string[]) {
	const posthog = PostHogClient();
	if (!posthog) return;
	codes.forEach((code) =>
		posthog.capture({
			distinctId: username,
			event: "achievement_unlocked",
			properties: { code },
		})
	);
	await posthog.shutdown();
}

/** Unlocks whatever the user has earned, then returns every achievement with its state. */
export async function syncAchievements(
	username: string
): Promise<ServiceResult<AchievementsPayload>> {
	const user = await prisma.user.findUnique({
		where: { username },
		select: {
			id: true,
			currentStreak: true,
			grades: { select: { code: true, name: true, grade: true } },
			achievements: { select: { code: true, unlockedAt: true } },
		},
	});
	if (!user) return failure("NOT_FOUND", "User not found");

	const unlocked = new Map(user.achievements.map((a) => [a.code, a.unlockedAt]));
	const newlyUnlocked = evaluateAchievements(
		{ grades: user.grades, currentStreak: user.currentStreak },
		new Set(unlocked.keys())
	);

	if (newlyUnlocked.length > 0) {
		try {
			await prisma.achievement.createMany({
				data: newlyUnlocked.map((code) => ({ userId: user.id, code })),
				skipDuplicates: true,
			});
		} catch (error) {
			logger.error("Failed to unlock achievements", {
				userId: user.id,
				error: error instanceof Error ? error.message : String(error),
			});
			return failure("INTERNAL", "Database Error");
		}
		const now = new Date();
		newlyUnlocked.forEach((code) => unlocked.set(code, now));
		await captureUnlocks(username, newlyUnlocked).catch((e) =>
			logger.error("Failed to capture achievement unlocks", { error: e })
		);
	}

	return success({ achievements: toAchievementItems(unlocked), newlyUnlocked });
}
