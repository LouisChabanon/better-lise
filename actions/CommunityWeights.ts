"use server";

import prisma from "@/lib/db";
import { verifySession } from "@/lib/sessions";
import { revalidatePath } from "next/cache";

export type WeightMap = Record<string, number>;

/**
 * Fetches the average weight for all codes from the database.
 */
export async function getCommunityWeights(): Promise<WeightMap> {
	// Aggregate average weight per code
	const groups = await prisma.gradeWeightVote.groupBy({
		by: ["code"],
		_avg: {
			weight: true,
		},
	});

	const weightMap: WeightMap = {};

	groups.forEach((g) => {
		if (g._avg.weight) {
			weightMap[g.code] = g._avg.weight;
		}
	});

	return weightMap;
}

/**
 * Allows a user to submit/update their weight for a specific code.
 */
export async function submitWeightVote(code: string, weight: number) {
	const session = await verifySession();
	if (!session.username) return { success: false, error: "Unauthorized" };

	const user = await prisma.user.findUnique({
		where: { username: session.username },
	});
	if (!user) return { success: false, error: "User not found" };

	if (weight <= 0) return { success: false, error: "Invalid weight" };

	try {
		await prisma.gradeWeightVote.upsert({
			where: {
				userId_code: {
					userId: user.id,
					code: code,
				},
			},
			update: {
				weight: weight,
			},
			create: {
				userId: user.id,
				code: code,
				weight: weight,
			},
		});

		revalidatePath("/simulator");
		return { success: true };
	} catch (error) {
		console.error("Failed to submit vote:", error);
		return { success: false, error: "Database error" };
	}
}
