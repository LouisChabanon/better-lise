import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
	user: { findUnique: vi.fn() },
	achievement: { createMany: vi.fn() },
}));

vi.mock("@/lib/db", () => ({ default: prismaMock }));
vi.mock("@/lib/posthog-server", () => ({ default: () => null }));

import { ACHIEVEMENTS } from "@/lib/achievements";
import {
	evaluateAchievements,
	syncAchievements,
	toAchievementItems,
} from "@/lib/services/achievements";

const grade = (grade: number, name = "DS", code = "FITE_S7_EEAA_DS") => ({ code, name, grade });
const facts = (grades: ReturnType<typeof grade>[], currentStreak = 1) => ({ grades, currentStreak });
const none = new Set<string>();

beforeEach(() => {
	vi.clearAllMocks();
	prismaMock.achievement.createMany.mockResolvedValue({ count: 0 });
});

describe("evaluateAchievements", () => {
	it("always unlocks FIRST_LOGIN and nothing else without grades", () => {
		expect(evaluateAchievements(facts([]), none)).toEqual(["FIRST_LOGIN"]);
	});

	it("unlocks grade value achievements", () => {
		const codes = evaluateAchievements(facts([grade(20), grade(0), grade(10)]), none);
		expect(codes).toEqual(expect.arrayContaining(["ACADEMIC_GOAT", "WORST_CASE_SCENARIO", "SUR_FIL"]));
	});

	it("unlocks reval achievements from reval or rattrapage grades", () => {
		expect(evaluateAchievements(facts([grade(8, "Rattrapage Maths")]), none)).toEqual(
			expect.arrayContaining(["REVAL", "SACQUE"])
		);
		const clutch = evaluateAchievements(facts([grade(10, "Reval Anglais")]), none);
		expect(clutch).toEqual(expect.arrayContaining(["REVAL", "CLUTCH", "SPEAK_ENGLISH"]));
		expect(clutch).not.toContain("SACQUE");
		expect(evaluateAchievements(facts([grade(12, "Reval", "FITE_S7_LV1_X")]), none)).toContain("SPEAK_ENGLISH");
	});

	it("does not treat non-reval grades as reval", () => {
		const codes = evaluateAchievements(facts([grade(4, "DS Anglais")]), none);
		expect(codes).not.toContain("REVAL");
		expect(codes).not.toContain("SPEAK_ENGLISH");
	});

	it("unlocks DIEU_MATA from 18 in a MATA grade", () => {
		expect(evaluateAchievements(facts([grade(18, "DS", "FITE_S5_MATA_DS")]), none)).toContain("DIEU_MATA");
		expect(evaluateAchievements(facts([grade(17.9, "DS", "FITE_S5_MATA_DS")]), none)).not.toContain("DIEU_MATA");
	});

	it("unlocks every reached streak tier", () => {
		expect(evaluateAchievements(facts([], 30), none)).toEqual(["FIRST_LOGIN", "STREAK_5", "STREAK_10", "STREAK_30"]);
	});

	it("skips already unlocked codes", () => {
		expect(evaluateAchievements(facts([], 5), new Set(["FIRST_LOGIN"]))).toEqual(["STREAK_5"]);
	});

	it("unlocks PILLIER only once every other achievement is owned", () => {
		const others = ACHIEVEMENTS.map((a) => a.code).filter((c) => c !== "PILLIER" && c !== "STREAK_300");
		expect(evaluateAchievements(facts([], 1), new Set(others))).toEqual([]);
		expect(evaluateAchievements(facts([], 300), new Set(others))).toEqual(["PILLIER", "STREAK_300"]);
	});
});

describe("toAchievementItems", () => {
	it("masks locked secrets and exposes unlocked ones", () => {
		const locked = toAchievementItems(new Map()).find((a) => a.code === "SACQUE")!;
		expect(locked).toMatchObject({ title: "???", description: null, snark: null, icon: null, isSecret: true, unlockedAt: null });

		const date = new Date("2025-01-02T03:04:05Z");
		const unlocked = toAchievementItems(new Map([["SACQUE", date]])).find((a) => a.code === "SACQUE")!;
		expect(unlocked).toMatchObject({ title: "Ami Sacqué", icon: "reload", unlockedAt: "2025-01-02T03:04:05.000Z" });
	});

	it("lists every achievement and turns empty snark into null", () => {
		const items = toAchievementItems(new Map());
		expect(items).toHaveLength(ACHIEVEMENTS.length);
		expect(items.find((a) => a.code === "FIRST_LOGIN")!.snark).toBeNull();
	});
});

describe("syncAchievements", () => {
	it("persists new unlocks and reports them", async () => {
		prismaMock.user.findUnique.mockResolvedValue({
			id: 7,
			currentStreak: 5,
			grades: [grade(20)],
			achievements: [{ code: "FIRST_LOGIN", unlockedAt: new Date("2025-01-01") }],
		});

		const result = await syncAchievements("2023-1234");

		expect(result.ok && result.data.newlyUnlocked).toEqual(["ACADEMIC_GOAT", "STREAK_5"]);
		expect(prismaMock.achievement.createMany).toHaveBeenCalledWith({
			data: [
				{ userId: 7, code: "ACADEMIC_GOAT" },
				{ userId: 7, code: "STREAK_5" },
			],
			skipDuplicates: true,
		});
		const goat = result.ok && result.data.achievements.find((a) => a.code === "ACADEMIC_GOAT");
		expect(goat && goat.unlockedAt).not.toBeNull();
	});

	it("does not write when nothing new is earned", async () => {
		prismaMock.user.findUnique.mockResolvedValue({
			id: 7,
			currentStreak: 1,
			grades: [],
			achievements: [{ code: "FIRST_LOGIN", unlockedAt: new Date() }],
		});
		const result = await syncAchievements("2023-1234");
		expect(result.ok && result.data.newlyUnlocked).toEqual([]);
		expect(prismaMock.achievement.createMany).not.toHaveBeenCalled();
	});

	it("reports missing users and database failures", async () => {
		prismaMock.user.findUnique.mockResolvedValueOnce(null);
		expect(await syncAchievements("x")).toMatchObject({ ok: false, code: "NOT_FOUND" });

		prismaMock.user.findUnique.mockResolvedValueOnce({ id: 1, currentStreak: 1, grades: [], achievements: [] });
		prismaMock.achievement.createMany.mockRejectedValueOnce(new Error("db"));
		expect(await syncAchievements("x")).toMatchObject({ ok: false, code: "INTERNAL" });
	});
});
