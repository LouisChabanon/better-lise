"use server";
import prisma from "@/lib/db";
import { unstable_cache } from "next/cache";
import {
	bucketScraperLogs,
	HealthBucket,
	HealthStatus,
	healthStatus,
	HISTORY_HOURS,
} from "@/lib/services/health";

interface LiseHealth {
	/** Average successful sync duration over the last two hours, in milliseconds. */
	avgDuration: number;
	count: number;
	status: HealthStatus;
	hourly: HealthBucket[];
}

async function getAverageTime(): Promise<LiseHealth> {
	const now = new Date();
	const twoHourAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
	const historyStart = new Date(now.getTime() - HISTORY_HOURS * 60 * 60 * 1000);

	const [aggreate, logs] = await Promise.all([
		prisma.scraperLog.aggregate({
			_avg: { duration: true },
			_count: { id: true },
			where: {
				createdAt: {
					gte: twoHourAgo,
				},
				status: "success",
			},
		}),
		prisma.scraperLog.findMany({
			where: { createdAt: { gte: historyStart } },
			select: { createdAt: true, duration: true, status: true },
		}),
	]);

	const avgDuration = aggreate._avg.duration || 0;
	const count = aggreate._count.id || 0;

	return {
		avgDuration,
		count,
		status: healthStatus(avgDuration, count),
		hourly: bucketScraperLogs(logs, now),
	};
}

export const getLiseHealth = unstable_cache(
	async () => getAverageTime(),
	["lise-health"],
	{ revalidate: 300, tags: ["lise-health"] }
);
