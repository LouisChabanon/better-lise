import "server-only"; // Ensure this file is only run on the server

import { cookies } from "next/headers";
import logger from "@/lib/logger";
import { signSession, verifyToken } from "@/lib/jwt";

export type { SessionPayload } from "@/lib/jwt";

const COOKIE_NAME = "jwt_token";

export const createSession = async (
	username: string,
	authToken: string
): Promise<string> => {
	logger.info("Creating user session", { username });
	const { token } = await signSession(username, authToken);

	try {
		(await cookies()).set(COOKIE_NAME, token, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production", // Breaks local http development otherwise
			sameSite: "lax",
			path: "/",
		});
	} catch (error) {
		logger.error("Failed to set cookie:", {
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
		});
	}

	return token;
};

export async function verifySession() {
	try {
		const cookie = (await cookies()).get(COOKIE_NAME)?.value;
		if (!cookie) {
			return { isAuth: false };
		}

		// verifyToken rejects bad signatures and expired tokens
		const session = await verifyToken(cookie);
		if (!session) {
			logger.warn("Invalid or expired session");
			await deleteSession();
			return { isAuth: false };
		}

		return {
			isAuth: true,
			username: session.username,
			sessionId: session.authToken,
		};
	} catch (error) {
		logger.error("Error verifying session:", {
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
		});
		return { isAuth: false };
	}
}

export async function deleteSession() {
	try {
		(await cookies()).delete(COOKIE_NAME);
		logger.info("Sucessfully deleted session");
	} catch (error) {
		logger.error("Failed to delete session", {
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
		});
	}
}
