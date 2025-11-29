"use server";
import prisma from "@/lib/db";
import { unstable_cache } from "next/cache";

interface LiseHealth {
	avgDuration: number;
	count: number;
}

async function getAverageTime(): Promise<LiseHealth> {
	const twoHourAgo = new Date();
	twoHourAgo.setHours(twoHourAgo.getHours() - 2);

	const aggreate = await prisma.scraperLog.aggregate({
		_avg: { duration: true },
		_count: { id: true },
		where: {
			createdAt: {
				gte: twoHourAgo,
			},
			status: "success",
		},
	});

	return {
		avgDuration: aggreate._avg.duration || 0,
		count: aggreate._count.id || 0,
	};
}

export const getLiseHealth = unstable_cache(
	async () => getAverageTime(),
	["lise-health"],
	{ revalidate: 300, tags: ["lise-health"] }
);
