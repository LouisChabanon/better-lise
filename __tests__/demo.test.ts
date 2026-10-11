import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi,
	type MockInstance,
} from "vitest";

const prismaMock = vi.hoisted(() => ({
	user: { findUnique: vi.fn(), upsert: vi.fn() },
	grade: {
		findMany: vi.fn(),
		findFirst: vi.fn(),
		deleteMany: vi.fn(),
		createMany: vi.fn(),
	},
	pushSubscription: { findMany: vi.fn(), delete: vi.fn() },
	scraperLog: { create: vi.fn() },
}));
const openLisePageMock = vi.hoisted(() => vi.fn());
const sendNotificationMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({ default: prismaMock }));
vi.mock("@/lib/posthog-server", () => ({ default: () => null }));
vi.mock("@/lib/sessions", () => ({ verifySession: vi.fn() }));
vi.mock("next/cache", () => ({
	unstable_cache: (fn: () => unknown) => fn,
	revalidatePath: vi.fn(),
}));
vi.mock("web-push", () => ({
	default: { setVapidDetails: vi.fn(), sendNotification: sendNotificationMock },
}));
vi.mock("@/lib/services/lise-session", async (importOriginal) => ({
	...(await importOriginal<object>()),
	openLisePage: openLisePageMock,
}));

import { authenticate, logoutFromLise } from "@/lib/services/auth";
import { syncGrades } from "@/lib/services/grades";
import { fetchAbsences } from "@/lib/services/absences";
import GetCalendar from "@/actions/GetCalendar";
import GetGradeDetails from "@/actions/GetGradeDetails";
import { notifyClassmates } from "@/actions/PushNotification";
import {
	DEMO_SESSION_ID,
	DEMO_USERNAME,
	demoCalendarEvents,
	demoGrades,
	isDemoGradeCode,
} from "@/lib/services/demo";
import { parseClassCode } from "@/lib/utils/simulation-utils";
import { GradeType } from "@/lib/types";

const DEMO_PASSWORD = "review-password";
const demoCreds = { username: DEMO_USERNAME, jsessionId: DEMO_SESSION_ID };
const demoUser = { id: 42, username: DEMO_USERNAME, class: null, tbk: null };

let fetchSpy: MockInstance<typeof fetch>;

beforeEach(() => {
	vi.clearAllMocks();
	process.env.DEMO_ACCOUNT_PASSWORD = DEMO_PASSWORD;
	fetchSpy = vi.spyOn(globalThis, "fetch");
});

afterEach(() => {
	fetchSpy.mockRestore();
	delete process.env.DEMO_ACCOUNT_PASSWORD;
});

describe("demo account sign-in", () => {
	it("signs in with the configured password without contacting Lise", async () => {
		prismaMock.user.findUnique.mockResolvedValue(null);
		prismaMock.user.upsert.mockResolvedValue({
			id: 42,
			username: DEMO_USERNAME,
		});
		prismaMock.grade.deleteMany.mockResolvedValue({ count: 0 });

		const result = await authenticate(DEMO_USERNAME, DEMO_PASSWORD);

		expect(result).toEqual({
			ok: true,
			data: {
				userId: 42,
				username: DEMO_USERNAME,
				jsessionId: DEMO_SESSION_ID,
			},
		});
		expect(fetchSpy).not.toHaveBeenCalled();
	});

	it("resets the demo grades on every sign-in so each review starts fresh", async () => {
		prismaMock.user.findUnique.mockResolvedValue(null);
		prismaMock.user.upsert.mockResolvedValue({
			id: 42,
			username: DEMO_USERNAME,
		});
		prismaMock.grade.deleteMany.mockResolvedValue({ count: 10 });

		await authenticate(DEMO_USERNAME, DEMO_PASSWORD);

		expect(prismaMock.grade.deleteMany).toHaveBeenCalledWith({
			where: { userId: 42 },
		});
	});

	it("rejects a wrong password without contacting Lise", async () => {
		const result = await authenticate(DEMO_USERNAME, "wrong");

		expect(result).toMatchObject({ ok: false, code: "INVALID_CREDENTIALS" });
		expect(fetchSpy).not.toHaveBeenCalled();
		expect(prismaMock.user.upsert).not.toHaveBeenCalled();
	});

	it("is disabled when no demo password is configured", async () => {
		delete process.env.DEMO_ACCOUNT_PASSWORD;

		const result = await authenticate(DEMO_USERNAME, DEMO_PASSWORD);

		expect(result).toMatchObject({ ok: false, code: "INVALID_CREDENTIALS" });
		expect(fetchSpy).not.toHaveBeenCalled();
	});

	it("signs out without calling Lise", async () => {
		expect(await logoutFromLise(DEMO_SESSION_ID)).toBe(true);
		expect(fetchSpy).not.toHaveBeenCalled();
	});
});

describe("demo grades", () => {
	it("seeds fixture grades on first sync instead of scraping Lise", async () => {
		const stored = demoGrades(new Date()).map((g, i) => ({
			id: i + 1,
			code: g.code,
			name: g.libelle,
			grade: g.note,
			date: g.date,
			absence: g.absence,
			comment: g.comment,
			teachers: g.teachers,
			opened: !g.isNew,
			userId: 42,
		}));
		prismaMock.user.findUnique.mockResolvedValue(demoUser);
		prismaMock.grade.findMany
			.mockResolvedValueOnce([])
			.mockResolvedValueOnce(stored);
		prismaMock.grade.createMany.mockResolvedValue({ count: stored.length });

		const result = await syncGrades(demoCreds, true);

		expect(openLisePageMock).not.toHaveBeenCalled();
		expect(prismaMock.scraperLog.create).not.toHaveBeenCalled();
		expect(prismaMock.grade.createMany).toHaveBeenCalledOnce();
		const seeded = prismaMock.grade.createMany.mock.calls[0][0].data;
		expect(seeded).toHaveLength(stored.length);
		expect(seeded.every((g: { userId: number }) => g.userId === 42)).toBe(true);
		expect(result.ok && result.data.some((g: GradeType) => g.isNew)).toBe(true);
	});

	it("returns stored grades on refresh without reseeding", async () => {
		prismaMock.user.findUnique.mockResolvedValue(demoUser);
		prismaMock.grade.findMany.mockResolvedValue([
			{
				id: 1,
				code: "DEMO_S7_MATA_DS1",
				name: "DS",
				grade: 14,
				date: "01/09/2026",
				absence: "",
				comment: "",
				teachers: "",
				opened: true,
				userId: 42,
			},
		]);

		const result = await syncGrades(demoCreds, true);

		expect(openLisePageMock).not.toHaveBeenCalled();
		expect(prismaMock.grade.createMany).not.toHaveBeenCalled();
		expect(result).toMatchObject({
			ok: true,
			data: [{ code: "DEMO_S7_MATA_DS1", isNew: false }],
		});
	});

	it("uses codes that never collide with real Lise grades and still parse into UEs", () => {
		const grades = demoGrades(new Date());

		expect(grades.length).toBeGreaterThanOrEqual(8);
		expect(grades.every((g) => isDemoGradeCode(g.code))).toBe(true);
		expect(isDemoGradeCode("FITE_S7_MATA_DS1")).toBe(false);
		for (const g of grades) {
			expect(parseClassCode(g.code).classCode).not.toBe("Autre");
		}
		expect(grades.filter((g) => g.isNew).length).toBeGreaterThanOrEqual(2);
	});

	it("serves plausible class statistics without querying other students", async () => {
		const details = await GetGradeDetails({
			code: "DEMO_S7_MATA_DS1",
		} as GradeType);

		expect(prismaMock.grade.findMany).not.toHaveBeenCalled();
		const stats = details.data!;
		expect(stats.count).toBeGreaterThan(20);
		expect(stats.distribution.counts.reduce((a, b) => a + b, 0)).toBe(
			stats.count,
		);
		expect(stats.min).toBeLessThanOrEqual(stats.median);
		expect(stats.median).toBeLessThanOrEqual(stats.max);
		expect(
			await GetGradeDetails({ code: "DEMO_S7_MATA_DS1" } as GradeType),
		).toEqual(details);
	});
});

describe("demo absences", () => {
	it("returns fixture absences with per-UE stats instead of scraping Lise", async () => {
		const result = await fetchAbsences(demoCreds);

		expect(openLisePageMock).not.toHaveBeenCalled();
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.absences.length).toBe(result.data.nbTotalAbsences);
		expect(result.data.stats.length).toBeGreaterThan(0);
		expect(result.data.dureeTotaleAbsences).toMatch(/^\d{2}h\d{2}$/);
	});
});

describe("demo agenda", () => {
	it("returns a timetable around the current week without fetching the iCal feed", async () => {
		const now = new Date();
		const result = await GetCalendar(DEMO_USERNAME);

		expect(fetchSpy).not.toHaveBeenCalled();
		expect(result.status).toBe("success");
		const inThisWeek = result.events.filter(
			(e) =>
				Math.abs(e.startDate.getTime() - now.getTime()) < 7 * 24 * 3600 * 1000,
		);
		expect(inThisWeek.length).toBeGreaterThan(5);
	});

	it("schedules classes on weekdays in Paris time, each ending after it starts", () => {
		const events = demoCalendarEvents(new Date("2026-09-16T10:00:00Z"));

		for (const e of events) {
			expect(e.endDate.getTime()).toBeGreaterThan(e.startDate.getTime());
			const parisDay = new Intl.DateTimeFormat("en-GB", {
				timeZone: "Europe/Paris",
				weekday: "short",
			}).format(e.startDate);
			expect(["Sat", "Sun"]).not.toContain(parisDay);
		}
		const firstMonday = events.find((e) =>
			e.startDate.toISOString().startsWith("2026-09-14"),
		);
		expect(firstMonday?.startDate.toISOString()).toBe(
			"2026-09-14T06:00:00.000Z",
		);
	});
});

describe("notifications", () => {
	it("never sends classmates' grades to the demo account", async () => {
		prismaMock.pushSubscription.findMany.mockResolvedValue([]);

		await notifyClassmates(
			"GIM2",
			"Cluny",
			1,
			"FITE_S7_MATA_DS1",
			"DS Matériaux",
		);

		const where = prismaMock.pushSubscription.findMany.mock.calls[0][0].where;
		expect(where.user.username).toEqual({ not: DEMO_USERNAME });
	});
});
