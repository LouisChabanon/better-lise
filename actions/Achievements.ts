"use server";

import prisma from "@/lib/db";
import { verifySession } from "@/lib/sessions";
import { ACHIEVEMENTS_LIST } from "@/lib/achievements-config";
import { syncAchievements } from "@/lib/services/achievements";
import { revalidatePath } from "next/cache";

export async function checkAndUnlockAchievements() {
	const session = await verifySession();
	if (!session.isAuth || !session.username) return { newUnlocks: [] };

	const result = await syncAchievements(session.username);
	if (!result.ok) return { newUnlocks: [] };

	const { newlyUnlocked } = result.data;
	if (newlyUnlocked.length > 0) revalidatePath("/achievements");

	// Return the full details of newly unlocked items for the UI Toast
	return {
		newUnlocks: newlyUnlocked
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
