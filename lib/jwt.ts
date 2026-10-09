import { jwtVerify, SignJWT } from "jose";

/** Lifetime of a Better Lise session. Matches Lise's own JSESSIONID lifetime. */
export const SESSION_DURATION_SECONDS = 2 * 60 * 60;

export type SessionPayload = {
	username: string;
	authToken: string; // Lise JSESSIONID
	iat: number; // issued at
	exp: number; // expiration time
};

function getSecret(): Uint8Array {
	const secret = process.env.JWT_SECRET;
	if (!secret) {
		throw new Error("JWT_SECRET is not defined");
	}
	return new TextEncoder().encode(secret);
}

export async function signSession(
	username: string,
	liseSessionId: string,
	now: number = Date.now()
): Promise<{ token: string; payload: SessionPayload }> {
	const iat = Math.floor(now / 1000);
	const payload: SessionPayload = {
		username,
		authToken: liseSessionId,
		iat,
		exp: iat + SESSION_DURATION_SECONDS,
	};

	const token = await new SignJWT(payload)
		.setProtectedHeader({ alg: "HS256" })
		.setIssuedAt(payload.iat)
		.setExpirationTime(payload.exp)
		.sign(getSecret());

	return { token, payload };
}

/**
 * Verifies signature and expiration. Returns null for any invalid token
 * (bad signature, expired, malformed, missing claims).
 */
export async function verifyToken(
	token: string
): Promise<SessionPayload | null> {
	const secret = getSecret();
	try {
		const { payload } = await jwtVerify(token, secret, {
			algorithms: ["HS256"],
		});
		if (
			typeof payload.username !== "string" ||
			typeof payload.authToken !== "string" ||
			typeof payload.exp !== "number"
		) {
			return null;
		}
		return payload as unknown as SessionPayload;
	} catch {
		return null;
	}
}
