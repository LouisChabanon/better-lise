"use server";

import prisma from "@/lib/db";
import { verifySession } from "@/lib/sessions";
import { ACHIEVEMENTS_LIST } from "@/lib/achievements-config";
import { revalidatePath } from "next/cache";
import GetGradeDetails from "@/actions/GetGradeDetails";

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
		if (!existingCodes.has(code)) {
			newUnlocks.push(code);
			existingCodes.add(code);
		}
	};

	unlock("FIRST_LOGIN");

	if (user.grades.length > 0) {
		const has20 = user.grades.some((g) => g.grade === 20);
		const has10 = user.grades.some((g) => g.grade == 10);
		const has0 = user.grades.some((g) => g.grade === 0);

		// Check for Sacquer achievement
		const revalGrades = user.grades.filter((g) => g.name.includes("Reval"));
		const hasReval = revalGrades.length > 0;
		const hasSacque = revalGrades.some((g) => g.grade < 10);

		// Check for DIEU-MATA achievement
		// let hasMataMax = false;
		// const mataGrades = user.grades.filter((g) => g.code.includes("MATA"));
		// if (mataGrades.length > 0) {
		// 	mataGrades.forEach(async (g) => {
		// 		const details = await GetGradeDetails(g);
		// 		const maxGrade = details.data?.max;
		// 		if (g.grade === maxGrade) hasMataMax = true;
		// 	});
		// }

		//if (hasMataMax) unlock("DIEU_MATA");
		if (has20) unlock("ACADEMIC_GOAT");
		if (has0) unlock("WORST_CASE_SCENARIO");
		if (hasReval) unlock("REVAL");
		if (hasSacque) unlock("SACQUE");
		if (has10) unlock("SUR_FIL");

		if (newUnlocks.length > 0) {
			await prisma.achievement.createMany({
				data: newUnlocks.map((code) => ({
					userId: user.id,
					code: code,
				})),
			});
			revalidatePath("/achievements");
		}

		return {
			newUnlocks: newUnlocks.map((code) =>
				ACHIEVEMENTS_LIST.find((a) => a.code === code)
			),
		};
	}
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
