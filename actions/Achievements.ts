"use server";

import prisma from "@/lib/db";
import { verifySession } from "@/lib/sessions";
import { ACHIEVEMENTS_LIST } from "@/lib/achievements-config";
import { revalidatePath } from "next/cache";

// Helper to check if a list of grades contains specific criteria
const hasGradeCondition = (grades: any[], condition: (g: any) => boolean) => {
	return grades.some(condition);
};

export async function checkAndUnlockAchievements() {
	const session = await verifySession();
	if (!session.isAuth) return { newUnlocks: [] };

	const user = await prisma.user.findUnique({
		where: { username: session.username },
		include: {
			achievements: true,
			grades: true,
		},
	});

	if (!user) return { newUnlocks: [] };

	const existingCodes = new Set(user.achievements.map((a) => a.code));
	const newUnlocks: string[] = [];

	const unlock = (code: string) => {
		if (!existingCodes.has(code) && !newUnlocks.includes(code)) {
			newUnlocks.push(code);
		}
	};

	// --- LOGIC IMPLEMENTATION ---

	// 1. Login Achievement
	unlock("FIRST_LOGIN");

	if (user.grades.length > 0) {
		// 2. Grade Value Achievements
		if (hasGradeCondition(user.grades, (g) => g.grade === 20))
			unlock("ACADEMIC_GOAT");
		if (hasGradeCondition(user.grades, (g) => g.grade === 0))
			unlock("WORST_CASE_SCENARIO");
		if (hasGradeCondition(user.grades, (g) => g.grade === 10))
			unlock("SUR_FIL");

		// 3. Reval / Specific Contexts
		const revalGrades = user.grades.filter(
			(g) =>
				g.name.toLowerCase().includes("reval") ||
				g.name.toLowerCase().includes("rattrapage")
		);

		if (revalGrades.length > 0) {
			unlock("REVAL");

			// SACQUE: < 10 in Reval
			if (revalGrades.some((g) => g.grade < 10)) unlock("SACQUE");

			// CLUTCH: Exactly 10 in Reval
			if (revalGrades.some((g) => g.grade === 10)) unlock("CLUTCH");

			// SPEAK_ENGLISH: Reval in English/LV1
			const englishReval = revalGrades.some(
				(g) =>
					g.name.toLowerCase().includes("anglais") ||
					g.name.toLowerCase().includes("lv1") ||
					g.code.includes("LV1")
			);
			if (englishReval) unlock("SPEAK_ENGLISH");
		}

		// 4. DIEU_MATA
		const mataHighGrade = user.grades.some(
			(g) => g.code.includes("MATA") && g.grade >= 18
		);
		if (mataHighGrade) unlock("DIEU_MATA");
	}

	// 6. PILLIER: All other achievements unlocked
	const allCodes = new Set([...existingCodes, ...newUnlocks]);
	const totalAchievements = ACHIEVEMENTS_LIST.length;
	// -1 because PILLIER itself is in the list
	if (allCodes.size >= totalAchievements - 1 && !allCodes.has("PILLIER")) {
		// Verify we actually have everything else
		const pillierCode = "PILLIER";
		const missing = ACHIEVEMENTS_LIST.filter(
			(a) => a.code !== pillierCode && !allCodes.has(a.code)
		);

		if (missing.length === 0) {
			newUnlocks.push(pillierCode);
		}
	}

	// --- DATABASE UPDATE ---
	if (newUnlocks.length > 0) {
		await prisma.achievement.createMany({
			data: newUnlocks.map((code) => ({
				userId: user.id,
				code: code,
			})),
			skipDuplicates: true,
		});
		revalidatePath("/achievements");
	}

	// Return the full details of newly unlocked items for the UI Toast
	return {
		newUnlocks: newUnlocks
			.map((code) => ACHIEVEMENTS_LIST.find((a) => a.code === code))
			.filter(Boolean),
	};
}

export async function getUnlockedAchievements() {
	const session = await verifySession();
	if (!session.isAuth) return [];

	const user = await prisma.user.findUnique({
		where: { username: session.username },
		include: { achievements: true },
	});

	return user?.achievements.map((a) => a.code) || [];
}
