import { CookieJar } from "tough-cookie";
import fetchCookie from "fetch-cookie";
import { toZonedTime } from "date-fns-tz";
import { differenceInCalendarDays } from "date-fns";
import prisma from "@/lib/db";
import logger from "@/lib/logger";
import { liseIdChecker } from "@/lib/validators";
import { failure, ServiceResult, success } from "./result";

const LISE_URI = process.env.LISE_URI || "https://lise.ensam.eu";
const PARIS_TZ = "Europe/Paris";

export type AuthenticatedUser = {
	userId: number;
	username: string;
	jsessionId: string;
};

// Login to lise.ensam.eu by bypassing CAS with the /login endpoint.
// A 302 means Lise accepted the credentials (weak validation).
async function loginToLise(
	username: string,
	password: string,
	jar: CookieJar
): Promise<{ success: boolean; status: number }> {
	const fetchWithCookies = fetchCookie(fetch, jar);
	const params = new URLSearchParams({
		username,
		password,
		j_idt28: "", // Required by Lise's JSF form
	});

	const res = await fetchWithCookies(`${LISE_URI}/login`, {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: params.toString(),
		redirect: "manual",
	});

	return { success: res.status === 302, status: res.status };
}

export function computeStreak(
	lastLogin: Date | null | undefined,
	currentStreak: number | null | undefined,
	now: Date = new Date()
): number {
	if (!lastLogin) return 1;
	const diffDays = differenceInCalendarDays(
		toZonedTime(now, PARIS_TZ),
		toZonedTime(lastLogin, PARIS_TZ)
	);
	if (diffDays === 1) return (currentStreak || 0) + 1;
	if (diffDays === 0) return currentStreak || 1;
	return 1;
}

async function upsertUser(username: string) {
	const existingUser = await prisma.user.findUnique({
		where: { username },
		select: { lastLogin: true, currentStreak: true },
	});
	const newStreak = computeStreak(
		existingUser?.lastLogin,
		existingUser?.currentStreak
	);

	return prisma.user.upsert({
		where: { username },
		update: { lastLogin: new Date(), currentStreak: newStreak },
		create: { username, lastLogin: new Date(), currentStreak: 1 },
	});
}

/** Validates credentials against Lise and records the login in the DB. */
export async function authenticate(
	username: string,
	password: string
): Promise<ServiceResult<AuthenticatedUser>> {
	if (!liseIdChecker(username) || !password) {
		return failure("INVALID_CREDENTIALS", "Identifiant ou mot de passe invalide");
	}

	const jar = new CookieJar();
	logger.info("Sign-in attempt started", { username });

	try {
		const liseResult = await loginToLise(username, password, jar);
		if (!liseResult.success) {
			logger.warn("Sign-in failed: Lise authentication rejected", {
				username,
				liseStatus: liseResult.status,
			});
			return failure(
				"INVALID_CREDENTIALS",
				"Identifiant ou mot de passe invalide (Echec de l'authentification Lise)"
			);
		}

		const jsessionid = jar
			.getCookiesSync(LISE_URI)
			.find((cookie) => cookie.key === "JSESSIONID");
		if (!jsessionid) {
			logger.error("Sign-in error: JSESSIONID missing after successful login", {
				username,
			});
			return failure("LISE_UNAVAILABLE", "Cookie de session Lise introuvable.");
		}

		const user = await upsertUser(username);
		logger.info("Sign-In sucessfull", { username, userId: user.id });

		return success({
			userId: user.id,
			username: user.username,
			jsessionId: jsessionid.value,
		});
	} catch (error) {
		logger.error("Unhandled error during sign-in", {
			username,
			error: error instanceof Error ? error.message : String(error),
		});
		return failure("INTERNAL", "Erreur interne. Veuillez réessayer plus tard.");
	}
}

/** Best-effort invalidation of the Lise session. */
export async function logoutFromLise(jsessionId: string): Promise<boolean> {
	try {
		const jar = new CookieJar();
		jar.setCookieSync(`JSESSIONID=${jsessionId}`, LISE_URI);
		jar.setCookieSync("isConnCookie=false", LISE_URI);
		const fetchWithCookies = fetchCookie(fetch, jar);

		const res = await fetchWithCookies(`${LISE_URI}/saiku/rest/saiku/session/`, {
			method: "DELETE",
		});
		if (res.status !== 200) {
			logger.warn("Lise logout endpoint returned non-200", { status: res.status });
		}
		return res.status === 200;
	} catch (error) {
		logger.warn("Lise logout failed", {
			error: error instanceof Error ? error.message : String(error),
		});
		return false;
	}
}
