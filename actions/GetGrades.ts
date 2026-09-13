"use server";
import { verifySession, deleteSession } from "@/lib/sessions";
import { RequestState } from "@/lib/types";
import logger from "@/lib/logger";
import { syncGrades } from "@/lib/services/grades";

export async function getGradeData(
	reload: boolean = true
): Promise<RequestState> {
	const session = await verifySession();
	if (!session.username) {
		logger.warn("GetGrades blocked: No active session");
		return { errors: "No username found in session.", success: false };
	}
	if (!session.sessionId) {
		logger.warn("No LISE session Id found in cookies", {
			username: session.username,
		});
		return { errors: "Session id not found.", success: false };
	}

	const result = await syncGrades(
		{ username: session.username, jsessionId: session.sessionId },
		reload
	);

	if (!result.ok) {
		if (result.code === "SESSION_EXPIRED") await deleteSession();
		return { errors: result.message, success: false };
	}
	return { data: result.data, success: true };
}
