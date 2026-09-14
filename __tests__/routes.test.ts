import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
	authenticate: vi.fn(),
	logoutFromLise: vi.fn(),
	syncGrades: vi.fn(),
	fetchAbsences: vi.fn(),
	getProfile: vi.fn(),
	updateProfile: vi.fn(),
	markGradesOpened: vi.fn(),
	markGradeNew: vi.fn(),
	deleteAccount: vi.fn(),
	getAgenda: vi.fn(),
	gradeDetails: vi.fn(),
	liseHealth: vi.fn(),
}));

vi.mock("@/lib/services/auth", () => ({
	authenticate: mocks.authenticate,
	logoutFromLise: mocks.logoutFromLise,
}));
vi.mock("@/lib/services/grades", () => ({ syncGrades: mocks.syncGrades }));
vi.mock("@/lib/services/absences", () => ({ fetchAbsences: mocks.fetchAbsences }));
vi.mock("@/lib/services/agenda", () => ({ getAgenda: mocks.getAgenda }));
vi.mock("@/lib/services/user", async (importOriginal) => ({
	...(await importOriginal<object>()),
	getProfile: mocks.getProfile,
	updateProfile: mocks.updateProfile,
	markGradesOpened: mocks.markGradesOpened,
	markGradeNew: mocks.markGradeNew,
	deleteAccount: mocks.deleteAccount,
}));
vi.mock("@/lib/db", () => ({ default: {} }));
vi.mock("@/actions/GetGradeDetails", () => ({ default: mocks.gradeDetails }));
vi.mock("@/actions/GetLiseHealth", () => ({ getLiseHealth: mocks.liseHealth }));

import { POST as login } from "@/app/api/v1/auth/login/route";
import { POST as logout } from "@/app/api/v1/auth/logout/route";
import { DELETE as deleteMe, GET as getMe, PATCH as patchMe } from "@/app/api/v1/me/route";
import { GET as getGrades } from "@/app/api/v1/grades/route";
import { GET as getStats } from "@/app/api/v1/grades/[code]/stats/route";
import { POST as openGrade } from "@/app/api/v1/grades/[code]/opened/route";
import { POST as openAll } from "@/app/api/v1/grades/opened/route";
import { POST as markNew } from "@/app/api/v1/grades/[code]/new/route";
import { GET as getAbsences } from "@/app/api/v1/absences/route";
import { GET as getAgenda } from "@/app/api/v1/agenda/route";
import { GET as getHealth } from "@/app/api/v1/health/route";
import { signSession, verifyToken } from "@/lib/jwt";
import { resetRateLimits } from "@/lib/rate-limit";
import { failure, success } from "@/lib/services/result";

const noParams = { params: Promise.resolve({}) };
const codeParams = (code: string) => ({ params: Promise.resolve({ code }) });

let token = "";

const req = (
	path: string,
	init: { method?: string; body?: unknown; auth?: boolean; ip?: string } = {}
) =>
	new NextRequest(`http://localhost/api/v1${path}`, {
		method: init.method ?? "GET",
		body: init.body === undefined ? undefined : JSON.stringify(init.body),
		headers: {
			...(init.auth === false ? {} : { authorization: `Bearer ${token}` }),
			"x-forwarded-for": init.ip ?? "10.0.0.1",
		},
	});

beforeEach(async () => {
	vi.clearAllMocks();
	resetRateLimits();
	process.env.JWT_SECRET = "test-secret-value-that-is-long-enough";
	token = (await signSession("2023-1234", "JSID")).token;
});

describe("POST /auth/login", () => {
	it("returns a verifiable token on success", async () => {
		mocks.authenticate.mockResolvedValue(
			success({ userId: 1, username: "2023-1234", jsessionId: "LISE" })
		);

		const res = await login(
			req("/auth/login", { method: "POST", body: { username: "2023-1234", password: "pw" }, auth: false })
		);
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(body.data.username).toBe("2023-1234");
		expect(new Date(body.data.expiresAt).getTime()).toBeGreaterThan(Date.now());
		expect(await verifyToken(body.data.token)).toMatchObject({ authToken: "LISE" });
	});

	it("rejects invalid payloads before calling Lise", async () => {
		const res = await login(
			req("/auth/login", { method: "POST", body: { username: "nope", password: "pw" }, auth: false })
		);
		expect(res.status).toBe(400);
		expect((await res.json()).error.code).toBe("VALIDATION");
		expect(mocks.authenticate).not.toHaveBeenCalled();
	});

	it("maps bad credentials to 401", async () => {
		mocks.authenticate.mockResolvedValue(failure("INVALID_CREDENTIALS", "bad"));
		const res = await login(
			req("/auth/login", { method: "POST", body: { username: "2023-1234", password: "x" }, auth: false })
		);
		expect(res.status).toBe(401);
	});

	it("rate limits an account even when the IP changes on every attempt", async () => {
		mocks.authenticate.mockResolvedValue(failure("INVALID_CREDENTIALS", "bad"));
		const attempt = (i: number) =>
			login(req("/auth/login", { method: "POST", body: { username: "2023-7777", password: "x" }, auth: false, ip: `9.9.9.${i}` }));
		for (let i = 0; i < 10; i++) await attempt(i);
		const res = await attempt(99);
		expect(res.status).toBe(429);
		expect(mocks.authenticate).toHaveBeenCalledTimes(10);
	});

	it("rate limits the 6th attempt from the same IP", async () => {
		mocks.authenticate.mockResolvedValue(failure("INVALID_CREDENTIALS", "bad"));
		const attempt = () =>
			login(req("/auth/login", { method: "POST", body: { username: "2023-1234", password: "x" }, auth: false, ip: "5.5.5.5" }));
		for (let i = 0; i < 5; i++) await attempt();
		const res = await attempt();
		expect(res.status).toBe(429);
		expect(mocks.authenticate).toHaveBeenCalledTimes(5);
	});
});

describe("authenticated routes", () => {
	it("require a bearer token", async () => {
		const res = await getGrades(req("/grades", { auth: false }), noParams);
		expect(res.status).toBe(401);
		expect(mocks.syncGrades).not.toHaveBeenCalled();
	});

	it("POST /auth/logout invalidates the Lise session", async () => {
		mocks.logoutFromLise.mockResolvedValue(true);
		const res = await logout(req("/auth/logout", { method: "POST" }), noParams);
		expect(res.status).toBe(200);
		expect(mocks.logoutFromLise).toHaveBeenCalledWith("JSID");
	});

	it("GET /grades syncs and sorts grades", async () => {
		mocks.syncGrades.mockResolvedValue(
			success([
				{ code: "OLD", date: "01/01/2024", isNew: false },
				{ code: "NEW", date: "01/01/2023", isNew: true },
			])
		);
		const res = await getGrades(req("/grades?refresh=false"), noParams);
		const body = await res.json();

		expect(mocks.syncGrades).toHaveBeenCalledWith({ username: "2023-1234", jsessionId: "JSID" }, false);
		expect(body.data.grades.map((g: { code: string }) => g.code)).toEqual(["NEW", "OLD"]);
	});

	it("GET /grades surfaces SESSION_EXPIRED and validates query", async () => {
		mocks.syncGrades.mockResolvedValue(failure("SESSION_EXPIRED", "expired"));
		const expired = await getGrades(req("/grades"), noParams);
		expect(expired.status).toBe(401);
		expect((await expired.json()).error.code).toBe("SESSION_EXPIRED");

		const invalid = await getGrades(req("/grades?refresh=maybe"), noParams);
		expect(invalid.status).toBe(400);
	});

	it("GET /grades/:code/stats returns statistics", async () => {
		mocks.gradeDetails.mockResolvedValueOnce({ data: { avg: 12 } }).mockResolvedValueOnce({ errors: "x" });
		const res = await getStats(req("/grades/ABC/stats"), codeParams("ABC"));
		expect(await res.json()).toMatchObject({ data: { avg: 12 } });
		expect(mocks.gradeDetails).toHaveBeenCalledWith({ code: "ABC" });

		const failed = await getStats(req("/grades/ABC/stats"), codeParams("ABC"));
		expect(failed.status).toBe(500);

		const invalid = await getStats(req("/grades//stats"), codeParams(""));
		expect(invalid.status).toBe(400);
	});

	it("POST /grades/:code/opened and /grades/opened mark grades", async () => {
		mocks.markGradesOpened.mockResolvedValue(success({ updated: 1 }));
		await openGrade(req("/grades/ABC/opened", { method: "POST" }), codeParams("ABC"));
		expect(mocks.markGradesOpened).toHaveBeenLastCalledWith("2023-1234", "ABC");
		await openAll(req("/grades/opened", { method: "POST" }), noParams);
		expect(mocks.markGradesOpened).toHaveBeenLastCalledWith("2023-1234");
		expect((await openGrade(req("/grades//opened", { method: "POST" }), codeParams(""))).status).toBe(400);
	});

	it("POST /grades/:code/new puts a grade back behind the casino reveal", async () => {
		mocks.markGradeNew.mockResolvedValue(success({ updated: 1 }));
		const res = await markNew(req("/grades/ABC/new", { method: "POST" }), codeParams("ABC"));
		expect(res.status).toBe(200);
		expect(mocks.markGradeNew).toHaveBeenCalledWith("2023-1234", "ABC");

		expect((await markNew(req("/grades//new", { method: "POST" }), codeParams(""))).status).toBe(400);
		expect((await markNew(req("/grades/ABC/new", { method: "POST", auth: false }), codeParams("ABC"))).status).toBe(401);
	});

	it("GET /absences returns parsed absences", async () => {
		mocks.fetchAbsences.mockResolvedValue(success({ nbTotalAbsences: 2 }));
		const res = await getAbsences(req("/absences"), noParams);
		expect(await res.json()).toMatchObject({ data: { nbTotalAbsences: 2 } });
	});

	it("GET and PATCH /me", async () => {
		mocks.getProfile.mockResolvedValue(success({ username: "2023-1234", tbk: null }));
		expect((await (await getMe(req("/me"), noParams)).json()).data.username).toBe("2023-1234");

		mocks.updateProfile.mockResolvedValue(success({ username: "2023-1234", tbk: "Cluny" }));
		const patched = await patchMe(req("/me", { method: "PATCH", body: { tbk: "Cluny" } }), noParams);
		expect(patched.status).toBe(200);
		expect(mocks.updateProfile).toHaveBeenCalledWith("2023-1234", { tbk: "Cluny" });

		const invalid = await patchMe(req("/me", { method: "PATCH", body: { tbk: "Paris" } }), noParams);
		expect(invalid.status).toBe(400);
	});

	it("DELETE /me removes the Better Lise account and closes the Lise session", async () => {
		mocks.deleteAccount.mockResolvedValue(success({ deleted: true }));
		mocks.logoutFromLise.mockResolvedValue(true);

		const res = await deleteMe(req("/me", { method: "DELETE" }), noParams);

		expect(res.status).toBe(200);
		expect(await res.json()).toMatchObject({ success: true, data: { deleted: true } });
		expect(mocks.deleteAccount).toHaveBeenCalledWith("2023-1234");
		expect(mocks.logoutFromLise).toHaveBeenCalledWith("JSID");
	});

	it("DELETE /me keeps the Lise session when the deletion fails", async () => {
		mocks.deleteAccount.mockResolvedValue(failure("INTERNAL", "Database Error"));

		const res = await deleteMe(req("/me", { method: "DELETE" }), noParams);

		expect(res.status).toBe(500);
		expect(mocks.logoutFromLise).not.toHaveBeenCalled();
	});

	it("DELETE /me requires a session", async () => {
		const res = await deleteMe(req("/me", { method: "DELETE", auth: false }), noParams);
		expect(res.status).toBe(401);
		expect(mocks.deleteAccount).not.toHaveBeenCalled();
	});
});

describe("public routes", () => {
	it("GET /agenda validates the query and wraps events", async () => {
		mocks.getAgenda.mockResolvedValue(success([{ title: "CM" }]));
		const res = await getAgenda(req("/agenda?liseId=2023-1234&tbk=Cluny&ru=true", { auth: false }));
		expect(await res.json()).toMatchObject({ data: { events: [{ title: "CM" }] } });
		expect(mocks.getAgenda).toHaveBeenCalledWith("2023-1234", "Cluny", true);

		const invalid = await getAgenda(req("/agenda?liseId=abc", { auth: false }));
		expect(invalid.status).toBe(400);
	});

	it("GET /health reports scraper health or an error", async () => {
		mocks.liseHealth.mockResolvedValueOnce({ avgDuration: 900, count: 4 });
		expect(await (await getHealth()).json()).toMatchObject({ data: { count: 4 } });
		mocks.liseHealth.mockRejectedValueOnce(new Error("db"));
		expect((await getHealth()).status).toBe(500);
	});
});
