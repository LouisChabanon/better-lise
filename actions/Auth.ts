"use server";

import { createSession, deleteSession } from "@/lib/sessions";
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
		logger.warn("Sign-in failed: Missing credentials.", {
			username: username ? "provided" : "missing",
			password: password ? "provided" : "missing",
		});
		return { error: "Un identifiant et un mot de passe sont requis" };
	}

	// Regex for ****-**** format
	if (!/^\d{4}-\d{4}$/.test(username)) {
		logger.warn("Sign-In failed: Format error", { username });
		return { error: "L'identifiant doit être au format 20xx-xxxx" };
	}

	return { username, password };
}

function isRateLimited(ip: string): boolean {
	const now = Date.now();
	const record = rateLimitMap.get(ip);

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

export async function signIn(
	state: FormState,
	formData: FormData
): Promise<FormState> {
	const headersList = await headers();
	const forwaredFor = headersList.get("x-forwarded-for");
	const ip = forwaredFor ? forwaredFor.split(",")[0].trim() : "127.0.0.1";

	if (isRateLimited(ip)) {
		logger.warn("Sign-In blocked: Rate limit exceeded", { ip });
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
			logger.warn(
				"Sign-In failed Invalid credentials or user does not exist on LISE",
				{ username, liseStatus: authResult.status }
			);
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
			logger.error("Sign-In error: Failed to retreive JESSIONID cookie.", {
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
			logger.error("Sign-In error: Failed to upsert user into database", {
				username,
			});
			return { errors: "Erreur: connexion à la base de données impossible" };
		}
		await createSession(user.username, jsessionid.value);
		logger.info("Sign-In sucessfull", {
			username: username,
			userId: user.id,
		});

		return { success: true, message: "Connexion réussie !" };
	} catch (error) {
		logger.error("Unhandled error during sign-in process.", {
			username,
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
		});
		return { errors: "Erreur interne. Veuillez réessayer plus tard." };
	}
}

// TODO: Delete session on lise for safety
export async function logOut(): Promise<void> {
	await deleteSession();
}
