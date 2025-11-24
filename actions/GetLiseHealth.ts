"use server";
import prisma from "@/lib/db";
import { unstable_cache } from "next/cache";

interface LiseHealth {
    avgDuration: number;
    count: number;
}

async function getAverageTime(): Promise<LiseHealth> {
    const currentDay = new Date();
    currentDay.setHours(0, 0, 0, 0);

    const aggreate = await prisma.scraperLog.aggregate({
        _avg: { duration: true },
        _count: { id: true },
        where: {
            createdAt: {
                gte: currentDay,
            },
            status: "success",
        },
    })

    return {
        avgDuration: aggreate._avg.duration || 0,
        count: aggreate._count.id || 0,
    };
}

export const getLiseHealth = unstable_cache(async () => getAverageTime(), ['lise-health'], { revalidate: 300, tags: ['lise-health'] });