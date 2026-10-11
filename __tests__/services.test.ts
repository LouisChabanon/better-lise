import { beforeEach, describe, expect, it, vi } from "vitest";
import * as cheerio from "cheerio";
import { GRADES_TABLE_HTML, ABSENCES_PAGE_HTML } from "./fixtures/lise-html";

const prismaMock = vi.hoisted(() => ({
	$transaction: vi.fn(),
	user: { findUnique: vi.fn(), upsert: vi.fn(), update: vi.fn(), delete: vi.fn() },
	absence: { deleteMany: vi.fn() },
	achievement: { deleteMany: vi.fn() },
	gradeWeightVote: { deleteMany: vi.fn() },
	pushSubscription: { deleteMany: vi.fn() },
	grade: {
		findMany: vi.fn(),
		findFirst: vi.fn(),
		update: vi.fn(),
		updateMany: vi.fn(),
		deleteMany: vi.fn(),
		createMany: vi.fn(),
	},
	scraperLog: { create: vi.fn() },
}));
const openLisePageMock = vi.hoisted(() => vi.fn());
const notifyMock = vi.hoisted(() => vi.fn());
const calendarMock = vi.hoisted(() => vi.fn());
const crousMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({ default: prismaMock }));
vi.mock("@/lib/posthog-server", () => ({ default: () => null }));
vi.mock("@/actions/PushNotification", () => ({ notifyClassmates: notifyMock }));
vi.mock("@/actions/GetCalendar", () => ({ default: calendarMock }));
vi.mock("@/actions/GetCrousData", () => ({ default: crousMock }));
vi.mock("@/lib/services/lise-session", async (importOriginal) => ({
	...(await importOriginal<object>()),
	openLisePage: openLisePageMock,
}));

import { authenticate, computeStreak, logoutFromLise } from "@/lib/services/auth";
import { diffGrades, syncGrades } from "@/lib/services/grades";
import { fetchAbsences } from "@/lib/services/absences";
import {
	deleteAccount,
	getProfile,
	markGradeNew,
	markGradesOpened,
	updateProfile,
} from "@/lib/services/user";
import { getAgenda } from "@/lib/services/agenda";
import { failure, success } from "@/lib/services/result";

const creds = { username: "2023-1234", jsessionId: "JSID" };

const dbGrade = (id: number, code: string, grade: number, opened = true) => ({
	id,
	code,
	name: code,
	grade,
	date: "01/01/2025",
	absence: "",
	comment: "",
	teachers: "",
	opened,
	userId: 1,
});

beforeEach(() => {
	vi.clearAllMocks();
	prismaMock.scraperLog.create.mockResolvedValue({});
	notifyMock.mockResolvedValue(undefined);
});

describe("computeStreak", () => {
	const now = new Date("2025-03-10T10:00:00Z");
	it("increments on consecutive days, keeps same day, resets otherwise", () => {
		expect(computeStreak(new Date("2025-03-09T10:00:00Z"), 4, now)).toBe(5);
		expect(computeStreak(new Date("2025-03-10T07:00:00Z"), 4, now)).toBe(4);
		expect(computeStreak(new Date("2025-03-01T10:00:00Z"), 4, now)).toBe(1);
		expect(computeStreak(null, null, now)).toBe(1);
	});
});

describe("authenticate", () => {
	it("rejects badly formatted ids without calling Lise", async () => {
		const fetchSpy = vi.spyOn(globalThis, "fetch");
		const result = await authenticate("bad", "pw");
		expect(result).toMatchObject({ ok: false, code: "INVALID_CREDENTIALS" });
		expect(fetchSpy).not.toHaveBeenCalled();
		fetchSpy.mockRestore();
	});

	it("returns INVALID_CREDENTIALS when Lise does not redirect", async () => {
		const fetchSpy = vi
			.spyOn(globalThis, "fetch")
			.mockResolvedValue(new Response("nope", { status: 200 }));
		const result = await authenticate("2023-1234", "pw");
		expect(result).toMatchObject({ ok: false, code: "INVALID_CREDENTIALS" });
		fetchSpy.mockRestore();
	});

	it("returns the JSESSIONID and upserts the user on success", async () => {
		const redirect = new Response(null, {
			status: 302,
			headers: { "set-cookie": "JSESSIONID=abc123; Path=/; HttpOnly", location: "/" },
		});
		// fetch-cookie stores cookies against the response URL, which a constructed Response lacks
		Object.defineProperty(redirect, "url", { value: "https://lise.ensam.eu/login" });
		const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(redirect);
		prismaMock.user.findUnique.mockResolvedValue(null);
		prismaMock.user.upsert.mockResolvedValue({ id: 7, username: "2023-1234" });

		const result = await authenticate("2023-1234", "pw");

		expect(result).toEqual(
			success({ userId: 7, username: "2023-1234", jsessionId: "abc123" })
		);
		const body = String(fetchSpy.mock.calls[0][1]?.body);
		expect(body).toContain("username=2023-1234");
		fetchSpy.mockRestore();
	});

	it("fails when Lise accepts but sets no session cookie", async () => {
		const redirect = new Response(null, { status: 302 });
		Object.defineProperty(redirect, "url", { value: "https://lise.ensam.eu/login" });
		const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(redirect);
		expect(await authenticate("2023-1234", "pw")).toMatchObject({
			ok: false,
			code: "LISE_UNAVAILABLE",
		});
		fetchSpy.mockRestore();
	});

	it("maps network errors to INTERNAL", async () => {
		const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("down"));
		expect(await authenticate("2023-1234", "pw")).toMatchObject({ code: "INTERNAL" });
		fetchSpy.mockRestore();
	});
});

describe("logoutFromLise", () => {
	it("reports success and swallows network errors", async () => {
		const fetchSpy = vi
			.spyOn(globalThis, "fetch")
			.mockResolvedValueOnce(new Response(null, { status: 200 }))
			.mockResolvedValueOnce(new Response(null, { status: 500 }))
			.mockRejectedValueOnce(new Error("down"));
		expect(await logoutFromLise("JSID")).toBe(true);
		expect(await logoutFromLise("JSID")).toBe(false);
		expect(await logoutFromLise("JSID")).toBe(false);
		fetchSpy.mockRestore();
	});
});

describe("diffGrades", () => {
	const scraped = (code: string, note: number) => ({
		code,
		note,
		libelle: code,
		date: "01/01/2025",
		absence: "",
		comment: "",
		teachers: "",
	});

	it("creates, updates, dedupes and removes grades", () => {
		const db = [
			dbGrade(1, "KEEP", 12),
			dbGrade(2, "CHANGED", 8),
			dbGrade(3, "DUP", 10),
			dbGrade(4, "DUP", 10),
			dbGrade(5, "GONE", 5),
		];
		const diff = diffGrades(
			db,
			[scraped("KEEP", 12), scraped("CHANGED", 11), scraped("DUP", 10), scraped("NEW", 15)],
			false
		);

		expect(diff.toCreate.map((g) => g.code)).toEqual(["NEW"]);
		expect(diff.toUpdate).toEqual([{ id: 2, note: 11 }]);
		expect(diff.idsToDelete.sort()).toEqual([4, 5]);
		expect(diff.removedCodes).toEqual(["GONE"]);
		expect(diff.result.map((g) => [g.code, g.note, g.isNew])).toEqual([
			["KEEP", 12, false],
			["CHANGED", 11, true],
			["DUP", 10, false],
			["NEW", 15, true],
		]);
	});

	it("does not flag grades as new on the first sync", () => {
		const diff = diffGrades([], [scraped("A", 10)], true);
		expect(diff.result[0].isNew).toBe(false);
	});
});

describe("syncGrades", () => {
	it("returns NOT_FOUND for unknown users", async () => {
		prismaMock.user.findUnique.mockResolvedValue(null);
		expect(await syncGrades(creds, true)).toMatchObject({ code: "NOT_FOUND" });
	});

	it("serves cached DB grades without scraping when reload is false", async () => {
		prismaMock.user.findUnique.mockResolvedValue({ id: 1, username: creds.username });
		prismaMock.grade.findMany.mockResolvedValue([dbGrade(1, "A", 12, false)]);

		const result = await syncGrades(creds, false);

		expect(openLisePageMock).not.toHaveBeenCalled();
		expect(result).toMatchObject({ ok: true, data: [{ code: "A", isNew: true }] });
	});

	it("propagates SESSION_EXPIRED from Lise", async () => {
		prismaMock.user.findUnique.mockResolvedValue({ id: 1, username: creds.username });
		prismaMock.grade.findMany.mockResolvedValue([]);
		openLisePageMock.mockResolvedValue(failure("SESSION_EXPIRED", "expired"));
		expect(await syncGrades(creds, true)).toMatchObject({ code: "SESSION_EXPIRED" });
	});

	it("scrapes, persists new grades and notifies classmates", async () => {
		prismaMock.user.findUnique.mockResolvedValue({
			id: 1,
			username: creds.username,
			class: "GIM2",
			tbk: "Cluny",
		});
		prismaMock.grade.findMany.mockResolvedValue([dbGrade(9, "FITE_S7_MATA_DS1", 15.5)]);
		prismaMock.grade.findFirst.mockResolvedValue(null);
		prismaMock.grade.createMany.mockResolvedValue({ count: 1 });
		openLisePageMock.mockResolvedValue(success(cheerio.load(GRADES_TABLE_HTML)));

		const result = await syncGrades(creds, true);

		expect(result.ok).toBe(true);
		expect(prismaMock.grade.createMany).toHaveBeenCalledWith({
			data: [expect.objectContaining({ code: "FITE_S7_MDSA_DS1", userId: 1, opened: false })],
		});
		expect(notifyMock).toHaveBeenCalledWith("GIM2", "Cluny", 1, "FITE_S7_MDSA_DS1", "DS Mécanique");
		expect(prismaMock.scraperLog.create).toHaveBeenCalled();
	});

	it("maps scraping exceptions to LISE_UNAVAILABLE", async () => {
		prismaMock.user.findUnique.mockResolvedValue({ id: 1, username: creds.username });
		prismaMock.grade.findMany.mockResolvedValue([]);
		openLisePageMock.mockRejectedValue(new Error("hidden fields missing"));
		expect(await syncGrades(creds, true)).toMatchObject({ code: "LISE_UNAVAILABLE" });
		expect(prismaMock.scraperLog.create).toHaveBeenCalledWith({
			data: expect.objectContaining({ endpoint: "grades", status: "error" }),
		});
	});
});

describe("fetchAbsences", () => {
	it("parses the absences page", async () => {
		openLisePageMock.mockResolvedValue(success(cheerio.load(ABSENCES_PAGE_HTML)));
		const result = await fetchAbsences(creds);
		expect(result).toMatchObject({ ok: true, data: { nbTotalAbsences: 3 } });
	});

	it("propagates expiry and maps errors", async () => {
		openLisePageMock.mockResolvedValueOnce(failure("SESSION_EXPIRED", "expired"));
		expect(await fetchAbsences(creds)).toMatchObject({ code: "SESSION_EXPIRED" });
		openLisePageMock.mockRejectedValueOnce(new Error("x"));
		expect(await fetchAbsences(creds)).toMatchObject({ code: "LISE_UNAVAILABLE" });
	});
});

describe("user service", () => {
	it("gets and updates the profile", async () => {
		const profile = { username: "2023-1234", class: "GIM2", tbk: "Cluny", currentStreak: 2 };
		prismaMock.user.findUnique.mockResolvedValueOnce(profile).mockResolvedValueOnce(null);
		expect(await getProfile("2023-1234")).toEqual(success(profile));
		expect(await getProfile("2023-1234")).toMatchObject({ code: "NOT_FOUND" });

		prismaMock.user.update.mockResolvedValueOnce(profile).mockRejectedValueOnce(new Error("db"));
		expect(await updateProfile("2023-1234", { tbk: "Cluny" })).toEqual(success(profile));
		expect(await updateProfile("2023-1234", { tbk: "Cluny" })).toMatchObject({ code: "INTERNAL" });
	});

	it("marks one or all grades as opened", async () => {
		prismaMock.user.findUnique.mockResolvedValue({ id: 3 });
		prismaMock.grade.updateMany.mockResolvedValue({ count: 2 });

		expect(await markGradesOpened("u", "CODE")).toEqual(success({ updated: 2 }));
		expect(prismaMock.grade.updateMany).toHaveBeenLastCalledWith({
			where: { userId: 3, code: "CODE" },
			data: { opened: true },
		});
		await markGradesOpened("u");
		expect(prismaMock.grade.updateMany).toHaveBeenLastCalledWith({
			where: { userId: 3, opened: false },
			data: { opened: true },
		});

		prismaMock.user.findUnique.mockResolvedValue(null);
		expect(await markGradesOpened("u")).toMatchObject({ code: "NOT_FOUND" });
	});

	it("puts an opened grade back to new for casino replays", async () => {
		prismaMock.user.findUnique.mockResolvedValue({ id: 3 });
		prismaMock.grade.updateMany.mockResolvedValue({ count: 1 });

		expect(await markGradeNew("u", "CODE")).toEqual(success({ updated: 1 }));
		expect(prismaMock.grade.updateMany).toHaveBeenLastCalledWith({
			where: { userId: 3, code: "CODE", opened: true },
			data: { opened: false },
		});

		prismaMock.user.findUnique.mockResolvedValue(null);
		expect(await markGradeNew("u", "CODE")).toMatchObject({ code: "NOT_FOUND" });
	});
});

describe("deleteAccount", () => {
	beforeEach(() => {
		prismaMock.$transaction.mockImplementation((operations: Promise<unknown>[]) =>
			Promise.all(operations)
		);
		for (const model of ["grade", "absence", "achievement", "gradeWeightVote", "pushSubscription"] as const) {
			prismaMock[model].deleteMany.mockResolvedValue({ count: 2 });
		}
		prismaMock.user.delete.mockResolvedValue({ id: 3 });
	});

	it("removes the user and every row they own in one transaction", async () => {
		prismaMock.user.findUnique.mockResolvedValue({ id: 3 });

		expect(await deleteAccount("2023-1234")).toEqual(success({ deleted: true }));

		expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
		for (const model of ["grade", "absence", "achievement", "gradeWeightVote", "pushSubscription"] as const) {
			expect(prismaMock[model].deleteMany).toHaveBeenCalledWith({ where: { userId: 3 } });
		}
		expect(prismaMock.user.delete).toHaveBeenCalledWith({ where: { id: 3 } });
	});

	it("reports a missing user without touching the database", async () => {
		prismaMock.user.findUnique.mockResolvedValue(null);

		expect(await deleteAccount("2023-1234")).toMatchObject({ code: "NOT_FOUND" });
		expect(prismaMock.$transaction).not.toHaveBeenCalled();
	});

	it("returns an internal error when the transaction fails", async () => {
		prismaMock.user.findUnique.mockResolvedValue({ id: 3 });
		prismaMock.$transaction.mockRejectedValue(new Error("db"));

		expect(await deleteAccount("2023-1234")).toMatchObject({ code: "INTERNAL" });
	});
});

describe("getAgenda", () => {
	const day = (h: number, m = 0) => new Date(2025, 2, 10, h, m);

	it("merges RU meals into lunch gaps and sorts events", async () => {
		calendarMock.mockResolvedValue({
			status: "success",
			events: [
				{ title: "Afternoon", startDate: day(14), endDate: day(16), isAllDay: false },
				{ title: "Morning", startDate: day(8), endDate: day(12), isAllDay: false },
			],
		});
		crousMock.mockResolvedValue([
			{ title: "RU", type: "RU", startDate: day(11, 30), endDate: day(13, 30), isAllDay: false },
		]);

		const result = await getAgenda("2023-1234", "Cluny", true);

		expect(crousMock).toHaveBeenCalledWith("Cluny");
		expect(result.ok && result.data.map((e) => e.title)).toEqual(["Morning", "RU", "Afternoon"]);
		const ru = result.ok ? result.data[1] : null;
		expect(ru?.startDate).toEqual(day(12));
		expect(ru?.endDate).toEqual(day(13, 30));
	});

	it("skips Crous when RU is disabled and reports calendar errors", async () => {
		calendarMock.mockResolvedValue({ status: "error", events: [] });
		expect(await getAgenda("2023-1234", "Cluny", false)).toMatchObject({
			code: "LISE_UNAVAILABLE",
		});
		expect(crousMock).not.toHaveBeenCalled();
	});
});
