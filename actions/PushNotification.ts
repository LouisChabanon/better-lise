"use server";

import webpush from "web-push";
import prisma from "@/lib/db";
import { verifySession } from "@/lib/sessions";
import logger from "@/lib/logger";
import { tbk, PromoCode } from "@/lib/types";

webpush.setVapidDetails(
	process.env.VAPID_SUBJECT || "mailto:louis.chabanon@gadz.org",
	process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
	process.env.VAPID_PRIVATE_KEY!
);

export async function getUserClassAndTbkFromDB(): Promise<{
	class: PromoCode | null | undefined;
	tbk: tbk | null | undefined;
} | null> {
	const session = await verifySession();
	if (!session.username) return null;

	try {
		const user = await prisma.user.findUnique({
			where: { username: session.username },
			select: { class: true, tbk: true },
		});
		const userClass = user?.class as PromoCode;
		const userTBK = user?.tbk as tbk;
		return { class: userClass, tbk: userTBK };
	} catch (error) {
		logger.error("Failed to get user class from DB", { error });
		return null;
	}
}

export async function saveSubscription(sub: any) {
	const session = await verifySession();
	if (!session.username) return { success: false, error: "Unauthorized" };

	if (
		!sub ||
		!sub.endpoint ||
		!sub.keys ||
		!sub.keys.p256dh ||
		!sub.keys.auth
	) {
		logger.error("Invalid subscription payload received", { payload: sub });
		return { success: false, error: "Invalid payload" };
	}

	const user = await prisma.user.findUnique({
		where: { username: session.username },
	});

	if (!user) return { success: false, error: "User not found in DB" };

	try {
		await prisma.pushSubscription.upsert({
			where: { endpoint: sub.endpoint },
			update: {
				p256dh: sub.keys.p256dh,
				auth: sub.keys.auth,
				userId: user.id,
			},
			create: {
				endpoint: sub.endpoint,
				p256dh: sub.keys.p256dh,
				auth: sub.keys.auth,
				userId: user.id,
			},
		});

		return { success: true };
	} catch (error) {
		logger.error("Failed to upsert subscription to DB", {
			error: String(error),
		});
		return { success: false, error: "Database Error" };
	}
}

export async function deleteSubscription(endpoint: any) {
	const session = await verifySession();
	if (!session.username) return { success: false, error: "Unauthorized" };

	try {
		await prisma.pushSubscription.delete({
			where: { endpoint: endpoint },
		});
		return { success: true };
	} catch (error) {
		logger.error("Failed to delete subscription", { error });
		return { success: false, error: "Database Error" };
	}
}

// Update user demi-promo
export async function updateUserClass(classCode: PromoCode) {
	const session = await verifySession();
	if (!session.username) return { success: false, error: "Unauthorized" };

	try {
		await prisma.user.update({
			where: { username: session.username },
			data: { class: classCode },
		});
		return { success: true };
	} catch (error) {
		logger.error("Failed to update user class in DB", { error });
		return { success: false, error: "Database Error" };
	}
}

export async function updateTbkDB(tbk: tbk) {
	const session = await verifySession();
	if (!session.username) return { success: false, error: "Unauthorized" };

	try {
		await prisma.user.update({
			where: { username: session.username },
			data: { tbk: tbk },
		});
		return { success: true };
	} catch (error) {
		logger.error("Failed to update user tbk in DB", { error });
		return { success: false, error: "Database Error" };
	}
}

export async function notifyClassmates(
	classCode: PromoCode,
	tbk: tbk,
	triggerUserId: number,
	gradeCode: string,
	gradeName: string
) {
	if (!classCode) return;

	const bannedKeywords = [
		"LV1",
		"LV2",
		"Anglais",
		"Allemand",
		"Espagnol",
		"Chinois",
	];

	if (
		bannedKeywords.some((key) => {
			gradeCode.split("_").includes(key);
		})
	)
		return;
	try {
		logger.info(`Sending push notifications for class ${classCode} at ${tbk}`, {
			triggerUserId,
			gradeCode,
		});

		const subscriptions = await prisma.pushSubscription.findMany({
			where: {
				user: {
					class: classCode,
					tbk: tbk,
					id: { not: triggerUserId },
				},
			},
		});

		if (subscriptions.length === 0) return;

		const payload = JSON.stringify({
			title: `Nouvelle note de ${classCode} !`,
			body: `${gradeName} est disponible. (${gradeCode})`,
			icon: "/apple-icon.png",
			url: "/grades",
		});

		const promises = subscriptions.map((sub: any) => {
			return webpush
				.sendNotification(
					{
						endpoint: sub.endpoint,
						keys: {
							p256dh: sub.p256dh,
							auth: sub.auth,
						},
					},
					payload
				)
				.catch(async (error: any) => {
					if (error.statusCode === 410 || error.statusCode === 404) {
						await prisma.pushSubscription.delete({ where: { id: sub.id } });
					}
				});
		});
		await Promise.all(promises);
	} catch (error) {
		logger.error("Global error sending push notification");
	}
}
