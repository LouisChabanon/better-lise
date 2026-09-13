"use server";

import { createSession, deleteSession } from "@/lib/sessions";
import logger from "@/lib/logger";
import { headers } from "next/headers";
import { getClientIp, isRateLimited } from "@/lib/rate-limit";
import { authenticate, logoutFromLise } from "@/lib/services/auth";
import { loginSchema, firstIssue } from "@/lib/api/validation";

export type FormState =
	| {
			errors?: string;
			message?: string;
			success?: boolean;
	  }
	| undefined;

export async function signIn(
	state: FormState,
	formData: FormData
): Promise<FormState> {
	const ip = getClientIp((await headers()).get("x-forwarded-for"));

	if (isRateLimited(ip)) {
		logger.warn("Sign-in blocked: Rate limit exceeded", { ip });
		return {
			success: false,
			errors:
				"Trop de tentatives de connexion. Veuillez réessayer dans une minute.",
		};
	}

	const username = formData.get("username")?.toString();
	const password = formData.get("password")?.toString();
	if (!username || !password) {
		return { errors: "Un identifiant et un mot de passe sont requis" };
	}

	const parsed = loginSchema.safeParse({ username, password });
	if (!parsed.success) {
		logger.warn("Sign-in validation failed", { reason: "invalid_format", username });
		return { errors: firstIssue(parsed.error) };
	}

	const result = await authenticate(parsed.data.username, parsed.data.password);
	if (!result.ok) {
		return { success: false, errors: result.message };
	}

	await createSession(result.data.username, result.data.jsessionId);
	return { success: true, message: "Connexion réussie !" };
}

export async function logOut(sessionId: string): Promise<void> {
	await logoutFromLise(sessionId);
	await deleteSession();
}
