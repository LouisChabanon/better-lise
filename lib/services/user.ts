import prisma from "@/lib/db";
import logger from "@/lib/logger";
import { failure, ServiceResult, success } from "./result";

export const PROMO_CODES = ["GIM1", "GIM2", "GIE1", "GIE2", "EXP", "Autre"] as const;
export const TBKS = [
	"Chalons",
	"Boquette",
	"Cluny",
	"Birse",
	"P3",
	"KIN",
	"Bordels",
	"Sibers",
	"Rabat",
] as const;

export type UserProfile = {
	username: string;
	class: string | null;
	tbk: string | null;
	currentStreak: number;
};

const profileSelect = {
	username: true,
	class: true,
	tbk: true,
	currentStreak: true,
} as const;

export async function getProfile(username: string): Promise<ServiceResult<UserProfile>> {
	const user = await prisma.user.findUnique({
		where: { username },
		select: profileSelect,
	});
	return user ? success(user) : failure("NOT_FOUND", "User not found");
}

export async function updateProfile(
	username: string,
	changes: { class?: string; tbk?: string }
): Promise<ServiceResult<UserProfile>> {
	try {
		const user = await prisma.user.update({
			where: { username },
			data: changes,
			select: profileSelect,
		});
		return success(user);
	} catch (error) {
		logger.error("Failed to update user profile", {
			error: error instanceof Error ? error.message : String(error),
		});
		return failure("INTERNAL", "Database Error");
	}
}

/** Marks one grade (by code) or all of the user's grades as opened. */
export async function markGradesOpened(
	username: string,
	code?: string
): Promise<ServiceResult<{ updated: number }>> {
	const user = await prisma.user.findUnique({ where: { username }, select: { id: true } });
	if (!user) return failure("NOT_FOUND", "User not found");

	const { count } = await prisma.grade.updateMany({
		where: code ? { userId: user.id, code } : { userId: user.id, opened: false },
		data: { opened: true },
	});
	return success({ updated: count });
}
