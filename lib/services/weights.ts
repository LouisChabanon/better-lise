import prisma from "@/lib/db";
import logger from "@/lib/logger";
import { isDemoUsername } from "./demo";
import { failure, ServiceResult, success } from "./result";

export type WeightMap = Record<string, number>;

type VoteGroup = { code: string; weight: number; count: number };

/** Keeps, for each code, the weight with the most votes (the first one seen on ties). */
export function mostVotedWeights(groups: VoteGroup[]): WeightMap {
	const weights: WeightMap = {};
	const bestCounts: Record<string, number> = {};
	for (const { code, weight, count } of groups) {
		if (bestCounts[code] === undefined || count > bestCounts[code]) {
			weights[code] = weight;
			bestCounts[code] = count;
		}
	}
	return weights;
}

/** Community coefficient of every grade code that received votes. */
export async function getCommunityWeights(): Promise<ServiceResult<WeightMap>> {
	try {
		const groups = await prisma.gradeWeightVote.groupBy({
			by: ["code", "weight"],
			_count: { _all: true },
		});
		return success(
			mostVotedWeights(
				groups.map((g) => ({ code: g.code, weight: g.weight, count: g._count._all }))
			)
		);
	} catch (error) {
		logger.error("Failed to load community weights", {
			error: error instanceof Error ? error.message : String(error),
		});
		return failure("INTERNAL", "Database Error");
	}
}

/** Records (or replaces) the user's coefficient vote for a grade code. */
export async function submitWeightVote(
	username: string,
	code: string,
	weight: number
): Promise<ServiceResult<{ code: string; weight: number }>> {
	if (!(weight > 0)) return failure("INTERNAL", "Invalid weight");

	// The review account must never influence the coefficients real students see
	if (isDemoUsername(username)) return success({ code, weight });

	const user = await prisma.user.findUnique({ where: { username }, select: { id: true } });
	if (!user) return failure("NOT_FOUND", "User not found");

	try {
		await prisma.gradeWeightVote.upsert({
			where: { userId_code: { userId: user.id, code } },
			update: { weight },
			create: { userId: user.id, code, weight },
		});
		return success({ code, weight });
	} catch (error) {
		logger.error("Failed to submit weight vote", {
			userId: user.id,
			error: error instanceof Error ? error.message : String(error),
		});
		return failure("INTERNAL", "Database Error");
	}
}
