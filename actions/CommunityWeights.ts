"use server";

import { verifySession } from "@/lib/sessions";
import { revalidatePath } from "next/cache";
import {
	getCommunityWeights as loadCommunityWeights,
	submitWeightVote as saveWeightVote,
	WeightMap,
} from "@/lib/services/weights";

export type { WeightMap };

/**
 * Fetches the most voted weight for all codes from the database.
 */
export async function getCommunityWeights(): Promise<WeightMap> {
	const result = await loadCommunityWeights();
	return result.ok ? result.data : {};
}

/**
 * Allows a user to submit/update their weight for a specific code.
 */
export async function submitWeightVote(code: string, weight: number) {
	const session = await verifySession();
	if (!session.username) return { success: false, error: "Unauthorized" };
	if (weight <= 0) return { success: false, error: "Invalid weight" };

	const result = await saveWeightVote(session.username, code, weight);
	if (!result.ok) return { success: false, error: result.message };

	revalidatePath("/moyenne");
	return { success: true };
}
