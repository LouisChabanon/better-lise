import { beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { fail, fromResult, ok } from "@/lib/api/respond";
import { extractBearer, withAuth } from "@/lib/api/with-auth";
import {
	agendaQuerySchema,
	gradesQuerySchema,
	loginSchema,
	profilePatchSchema,
	readJson,
} from "@/lib/api/validation";
import { signSession } from "@/lib/jwt";
import { failure, success } from "@/lib/services/result";

const ctx = { params: Promise.resolve({}) };

describe("respond", () => {
	it("wraps data in a success envelope with no-store", async () => {
		const res = ok({ a: 1 });
		expect(res.status).toBe(200);
		expect(res.headers.get("cache-control")).toBe("no-store");
		expect(await res.json()).toEqual({ success: true, data: { a: 1 }, error: null });
	});

	it.each([
		["UNAUTHORIZED", 401],
		["SESSION_EXPIRED", 401],
		["VALIDATION", 400],
		["RATE_LIMITED", 429],
		["NOT_FOUND", 404],
		["LISE_UNAVAILABLE", 502],
		["INTERNAL", 500],
	] as const)("maps %s to HTTP %i", async (code, status) => {
		const res = fail(code, "msg");
		expect(res.status).toBe(status);
		expect(await res.json()).toEqual({
			success: false,
			data: null,
			error: { code, message: "msg" },
		});
	});

	it("converts service results, applying the mapper on success", async () => {
		expect(await fromResult(success(2), (n) => n * 2).json()).toMatchObject({ data: 4 });
		const res = fromResult(failure("SESSION_EXPIRED", "expired"));
		expect(res.status).toBe(401);
	});
});

describe("withAuth", () => {
	beforeEach(() => {
		process.env.JWT_SECRET = "test-secret-value-that-is-long-enough";
	});

	const handler = withAuth(async (_req, creds) => ok(creds));
	const request = (auth?: string) =>
		new NextRequest("http://localhost/api/v1/me", {
			headers: auth ? { authorization: auth } : {},
		});

	it("parses bearer headers", () => {
		expect(extractBearer("Bearer abc")).toBe("abc");
		expect(extractBearer("bearer abc")).toBe("abc");
		expect(extractBearer("Basic abc")).toBeNull();
		expect(extractBearer(null)).toBeNull();
	});

	it("rejects missing and invalid tokens", async () => {
		const missing = await handler(request(), ctx);
		expect(missing.status).toBe(401);
		expect((await missing.json()).error.code).toBe("UNAUTHORIZED");

		const invalid = await handler(request("Bearer nope"), ctx);
		expect(invalid.status).toBe(401);
	});

	it("passes credentials from a valid token", async () => {
		const { token } = await signSession("2023-1234", "JSID");
		const res = await handler(request(`Bearer ${token}`), ctx);
		expect(await res.json()).toMatchObject({
			data: { username: "2023-1234", jsessionId: "JSID" },
		});
	});

	it("turns handler exceptions into INTERNAL errors", async () => {
		const { token } = await signSession("2023-1234", "JSID");
		const throwing = withAuth(async () => {
			throw new Error("boom");
		});
		const res = await throwing(request(`Bearer ${token}`), ctx);
		expect(res.status).toBe(500);
		expect((await res.json()).error.message).not.toContain("boom");
	});
});

describe("validation schemas", () => {
	it("validates login payloads", () => {
		expect(loginSchema.safeParse({ username: "2023-1234", password: "x" }).success).toBe(true);
		expect(loginSchema.safeParse({ username: "20231234", password: "x" }).success).toBe(false);
		expect(loginSchema.safeParse({ username: "2023-1234", password: "" }).success).toBe(false);
	});

	it("validates profile patches", () => {
		expect(profilePatchSchema.safeParse({ tbk: "Cluny" }).success).toBe(true);
		expect(profilePatchSchema.safeParse({ class: "GIM9" }).success).toBe(false);
		expect(profilePatchSchema.safeParse({}).success).toBe(false);
		expect(profilePatchSchema.safeParse({ tbk: "Cluny", admin: true }).success).toBe(false);
	});

	it("applies agenda and grades query defaults", () => {
		expect(agendaQuerySchema.parse({ liseId: "2023-1234" })).toEqual({
			liseId: "2023-1234",
			tbk: "Sibers",
			ru: false,
		});
		expect(agendaQuerySchema.parse({ liseId: "2023-1234", ru: "1" }).ru).toBe(true);
		expect(gradesQuerySchema.parse({})).toEqual({ refresh: true });
		expect(gradesQuerySchema.parse({ refresh: "false" })).toEqual({ refresh: false });
		expect(gradesQuerySchema.safeParse({ refresh: "maybe" }).success).toBe(false);
	});

	it("reads JSON bodies safely", async () => {
		const good = new Request("http://x", { method: "POST", body: '{"a":1}' });
		const bad = new Request("http://x", { method: "POST", body: "{" });
		expect(await readJson(good)).toEqual({ a: 1 });
		expect(await readJson(bad)).toBeNull();
	});
});
