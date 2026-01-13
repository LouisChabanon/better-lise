"use server";

import { createSession, deleteSession, verifySession } from "@/lib/sessions";
import prisma from "@/lib/db";
import { CookieJar } from "tough-cookie";
import fetchCookie from "fetch-cookie";
import logger from "@/lib/logger";
import { headers } from "next/headers";

export type FormState =
	| {
			errors?: string;
			message?: string;
			success?: boolean;
	  }
	| undefined;

const LISE_URI = process.env.LISE_URI;

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

const WINDOW_DURATION = 60 * 1000;
const MAX_ATTEMPTS = 5;

function validateCredentials(formData: FormData): {
	username?: string;
	password?: string;
	error?: string;
} {
	const username = formData.get("username")?.toString();
	const password = formData.get("password")?.toString();

	if (!username || !password) {
		logger.warn("Sign-in validation failed", { reason: "missing_credentials" });
		return { error: "Un identifiant et un mot de passe sont requis" };
	}

	// Regex for ****-**** format
	if (!/^\d{4}-\d{4}$/.test(username)) {
		logger.warn("Sign-in validation failed", {
			reason: "invalid_format",
			username,
		});
		return { error: "L'identifiant doit être au format 20xx-xxxx" };
	}

	return { username, password };
}

function isRateLimited(ip: string): boolean {
	const now = Date.now();
	const record = rateLimitMap.get(ip);

	const whitelistStr = process.env.IP_WHITELIST || "";
	const whitelistSet = new Set(
		whitelistStr.split(",").map((item) => item.trim())
	);

	if (whitelistSet.has(ip)) {
		return false;
	}

	if (!record || now > record.resetAt) {
		rateLimitMap.set(ip, { count: 1, resetAt: now + WINDOW_DURATION });
		return false;
	}

	if (record.count >= MAX_ATTEMPTS) {
		return true;
	}

	record.count += 1;
	return false;
}

// Login to Lise.ensam.eu by bypassing CAS with /login endpoint....
async function authenticateWithLise(
	username: string,
	password: string,
	fetchWithCookies: any
): Promise<{ success: boolean; status: number }> {
	const params = new URLSearchParams();

	params.append("username", username);
	params.append("password", password);
	params.append("j_idt28", ""); // Don't ask me why

	const res = await fetchWithCookies(`${LISE_URI}/login`, {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: params.toString(),
		redirect: "manual",
	});

	// If Lise redirect it means the user is authenticated (Weak validation)
	// TODO: Check for redirection header instead
	return { success: res.status === 302, status: res.status };
}

async function logoutWithLise(
	jSessionId: string
): Promise<{ success: boolean; status: number }> {
	const jar = new CookieJar();
	jar.setCookieSync(`JSESSIONID=${jSessionId}`, LISE_URI!);
	jar.setCookieSync("isConnCookie=false", LISE_URI!);
	const fetchWithCookies = fetchCookie(fetch, jar);

	const res = await fetchWithCookies(`${LISE_URI}/saiku/rest/saiku/session/`, {
		method: "DELETE",
	});

	return { success: res.status === 200, status: res.status };
}

export async function signIn(
	state: FormState,
	formData: FormData
): Promise<FormState> {
	const headersList = await headers();
	const forwaredFor = headersList.get("x-forwarded-for");
	const ip = forwaredFor ? forwaredFor.split(",")[0].trim() : "127.0.0.1";

	if (isRateLimited(ip)) {
		logger.warn("Sign-in blocked: Rate limit exceeded", { ip });
		return {
			success: false,
			errors:
				"Trop de tentatives de connexion. Veuillez réessayer dans une minute.",
		};
	}

	const { username, password, error } = validateCredentials(formData);
	if (error) return { errors: error };

	// Create a new cookie jar to get Lise's JSESSIONID cookie
	const jar = new CookieJar();
	const fetchWithCookies = fetchCookie(fetch, jar);

	logger.info("Sign-in attempt started", { username });

	try {
		const authResult = await authenticateWithLise(
			username!,
			password!,
			fetchWithCookies
		);

		if (!authResult.success) {
			logger.warn("Sign-in failed: Lise authentication rejected", {
				username,
				liseStatus: authResult.status,
			});
			return {
				success: false,
				errors:
					"Identifiant ou mot de passe invalide (Echec de l'authentification Lise)",
			};
		}

		const jsessionid = jar
			.getCookiesSync(`${LISE_URI}`)
			.find((cookie) => cookie.key === "JSESSIONID");

		if (!jsessionid) {
			logger.error("Sign-in error: JSESSIONID missing after successful login", {
				username,
			});
			return { errors: "Erreur interne: cookie de session introuvable." };
		}

		const user = await prisma.user.upsert({
			where: { username: username },
			update: { lastLogin: new Date() },
			create: { username: username!, lastLogin: new Date() },
		});
		if (!user) {
			logger.error("Sign-in error: Database upsert failed", { username });
			return { errors: "Erreur: connexion à la base de données impossible" };
		}
		await createSession(user.username, jsessionid.value);
		logger.info("Sign-In sucessfull", {
			username: username,
			userId: user.id,
		});

		return { success: true, message: "Connexion réussie !" };
	} catch (error) {
		logger.error("Unhandled error during sign-in", {
			username,
			error: error instanceof Error ? error.message : String(error),
		});
		return { errors: "Erreur interne. Veuillez réessayer plus tard." };
	}
}

export async function logOut(sessionId: string): Promise<void> {
	const liseLogout = await logoutWithLise(sessionId);
	if (!liseLogout.success) {
		logger.warn("Lise logout endpoint returned non-200", {
			status: liseLogout.status,
		});
	}
	await deleteSession();
}
