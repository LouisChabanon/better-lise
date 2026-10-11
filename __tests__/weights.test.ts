import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
	user: { findUnique: vi.fn() },
	gradeWeightVote: { groupBy: vi.fn(), upsert: vi.fn() },
}));

vi.mock("@/lib/db", () => ({ default: prismaMock }));

import { getCommunityWeights, mostVotedWeights, submitWeightVote } from "@/lib/services/weights";

beforeEach(() => vi.clearAllMocks());

describe("mostVotedWeights", () => {
	it("keeps the most voted weight per code, the first one on ties", () => {
		expect(
			mostVotedWeights([
				{ code: "A", weight: 1, count: 2 },
				{ code: "A", weight: 3, count: 5 },
				{ code: "B", weight: 2, count: 1 },
				{ code: "B", weight: 4, count: 1 },
			])
		).toEqual({ A: 3, B: 2 });
	});
});

describe("getCommunityWeights", () => {
	it("aggregates votes from the database", async () => {
		prismaMock.gradeWeightVote.groupBy.mockResolvedValue([{ code: "A", weight: 2, _count: { _all: 3 } }]);
		expect(await getCommunityWeights()).toEqual({ ok: true, data: { A: 2 } });
	});

	it("maps database errors", async () => {
		prismaMock.gradeWeightVote.groupBy.mockRejectedValue(new Error("db"));
		expect(await getCommunityWeights()).toMatchObject({ ok: false, code: "INTERNAL" });
	});
});

describe("submitWeightVote", () => {
	it("upserts the user's vote", async () => {
		prismaMock.user.findUnique.mockResolvedValue({ id: 9 });
		prismaMock.gradeWeightVote.upsert.mockResolvedValue({});

		expect(await submitWeightVote("2023-1234", "A", 2.5)).toEqual({ ok: true, data: { code: "A", weight: 2.5 } });
		expect(prismaMock.gradeWeightVote.upsert).toHaveBeenCalledWith({
			where: { userId_code: { userId: 9, code: "A" } },
			update: { weight: 2.5 },
			create: { userId: 9, code: "A", weight: 2.5 },
		});
	});

	it("never stores votes from the demo account", async () => {
		expect(await submitWeightVote("0000-0000", "DEMO_A", 2)).toMatchObject({ ok: true });
		expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
		expect(prismaMock.gradeWeightVote.upsert).not.toHaveBeenCalled();
	});

	it("rejects invalid weights, unknown users and database errors", async () => {
		expect(await submitWeightVote("2023-1234", "A", 0)).toMatchObject({ ok: false });

		prismaMock.user.findUnique.mockResolvedValueOnce(null);
		expect(await submitWeightVote("2023-1234", "A", 1)).toMatchObject({ ok: false, code: "NOT_FOUND" });

		prismaMock.user.findUnique.mockResolvedValueOnce({ id: 9 });
		prismaMock.gradeWeightVote.upsert.mockRejectedValueOnce(new Error("db"));
		expect(await submitWeightVote("2023-1234", "A", 1)).toMatchObject({ ok: false, code: "INTERNAL" });
	});
});
