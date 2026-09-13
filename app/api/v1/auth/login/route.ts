import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api/respond";
import { firstIssue, loginSchema, readJson } from "@/lib/api/validation";
import { signSession } from "@/lib/jwt";
import logger from "@/lib/logger";
import { getClientIp, isRateLimited } from "@/lib/rate-limit";
import { authenticate } from "@/lib/services/auth";

export async function POST(request: NextRequest) {
	const ip = getClientIp(request.headers.get("x-forwarded-for"));
	if (isRateLimited(ip)) {
		logger.warn("API sign-in blocked: Rate limit exceeded", { ip });
		return fail(
			"RATE_LIMITED",
			"Trop de tentatives de connexion. Veuillez réessayer dans une minute."
		);
	}

	const parsed = loginSchema.safeParse(await readJson(request));
	if (!parsed.success) {
		return fail("VALIDATION", firstIssue(parsed.error));
	}

	const result = await authenticate(parsed.data.username, parsed.data.password);
	if (!result.ok) {
		return fail(result.code, result.message);
	}

	const { token, payload } = await signSession(
		result.data.username,
		result.data.jsessionId
	);

	return ok({
		token,
		username: payload.username,
		expiresAt: new Date(payload.exp * 1000).toISOString(),
	});
}
