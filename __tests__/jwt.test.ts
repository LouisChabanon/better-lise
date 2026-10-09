import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SignJWT } from "jose";
import { SESSION_DURATION_SECONDS, signSession, verifyToken } from "@/lib/jwt";

const SECRET = "test-secret-value-that-is-long-enough";

describe("jwt", () => {
	beforeEach(() => {
		process.env.JWT_SECRET = SECRET;
	});
	afterEach(() => {
		process.env.JWT_SECRET = SECRET;
	});

	it("signs a session that verifies back to the same payload", async () => {
		const { token, payload } = await signSession("2023-1234", "JSESSION");
		expect(payload.exp - payload.iat).toBe(SESSION_DURATION_SECONDS);

		const verified = await verifyToken(token);
		expect(verified).toMatchObject({ username: "2023-1234", authToken: "JSESSION" });
	});

	it("rejects a token signed with another secret", async () => {
		const { token } = await signSession("2023-1234", "JSESSION");
		process.env.JWT_SECRET = "another-secret-another-secret";
		expect(await verifyToken(token)).toBeNull();
	});

	it("rejects expired tokens", async () => {
		const threeHoursAgo = Date.now() - 3 * 60 * 60 * 1000;
		const { token } = await signSession("2023-1234", "JSESSION", threeHoursAgo);
		expect(await verifyToken(token)).toBeNull();
	});

	it("rejects malformed tokens and tokens missing claims", async () => {
		expect(await verifyToken("not-a-jwt")).toBeNull();

		const noClaims = await new SignJWT({ foo: "bar" })
			.setProtectedHeader({ alg: "HS256" })
			.setExpirationTime("1h")
			.sign(new TextEncoder().encode(SECRET));
		expect(await verifyToken(noClaims)).toBeNull();
	});

	it("throws when JWT_SECRET is missing", async () => {
		delete process.env.JWT_SECRET;
		await expect(signSession("2023-1234", "x")).rejects.toThrow("JWT_SECRET");
	});
});
