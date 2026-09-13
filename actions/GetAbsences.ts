"use server";
import { verifySession, deleteSession } from "@/lib/sessions";
import { AbsencesRequestState } from "@/lib/types";
import logger from "@/lib/logger";
import { fetchAbsences } from "@/lib/services/absences";

export async function getAbsenceData(
	reload: boolean = true
): Promise<AbsencesRequestState> {
	const session = await verifySession();
	if (!session.username) {
		logger.warn("User has no active session, failed to fetch absences");
		return { errors: "No username found in session.", success: false };
	}
	if (!session.sessionId) {
		logger.warn("No Lise session Id found in cookie", {
			username: session.username,
		});
		return { errors: "Session id not found.", success: false };
	}
	if (!reload) {
		return { errors: "Feature is not ready yet", success: false };
	}

	const result = await fetchAbsences({
		username: session.username,
		jsessionId: session.sessionId,
	});

	if (!result.ok) {
		if (result.code === "SESSION_EXPIRED") await deleteSession();
		return { errors: result.message, success: false };
	}
	return { success: true, data: result.data };
}
