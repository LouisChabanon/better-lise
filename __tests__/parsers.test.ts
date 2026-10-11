import { describe, expect, it } from "vitest";
import * as cheerio from "cheerio";
import { parseGradesTable, sortGrades } from "@/lib/parsers/grades";
import {
	isUnjustified,
	matchCourse,
	parseAbsencesPage,
	parseDurationToHours,
} from "@/lib/parsers/absences";
import { isLiseLoginPage } from "@/lib/parsers/lise-page";
import courseData from "@/ue_data.json";
import {
	ABSENCES_PAGE_HTML,
	GRADES_TABLE_HTML,
	HOME_PAGE_HTML,
	LOGIN_PAGE_HTML,
	NO_ABSENCES_PAGE_HTML,
} from "./fixtures/lise-html";
import { GradeType } from "@/lib/types";

describe("isLiseLoginPage", () => {
	it("detects the CAS login page", () => {
		expect(isLiseLoginPage(cheerio.load(LOGIN_PAGE_HTML))).toBe(true);
		expect(isLiseLoginPage(cheerio.load("<title>Sign in</title>"))).toBe(true);
	});

	it("returns false for an authenticated page", () => {
		expect(isLiseLoginPage(cheerio.load(HOME_PAGE_HTML))).toBe(false);
	});
});

describe("parseGradesTable", () => {
	it("parses valid rows with French decimal commas and skips malformed ones", () => {
		const { grades, skippedRows } = parseGradesTable(cheerio.load(GRADES_TABLE_HTML));

		expect(skippedRows).toBe(2);
		expect(grades).toEqual([
			{
				date: "12/01/2025",
				code: "FITE_S7_MATA_DS1",
				libelle: "DS Matériaux",
				note: 15.5,
				absence: "",
				comment: "",
				teachers: "M. Morel",
			},
			expect.objectContaining({ code: "FITE_S7_MDSA_DS1", note: 9, comment: "Bof" }),
		]);
	});

	it("returns no grades when the table is missing", () => {
		expect(parseGradesTable(cheerio.load("<html></html>"))).toEqual({
			grades: [],
			skippedRows: 0,
		});
	});
});

describe("sortGrades", () => {
	const grade = (code: string, date: string, isNew = false): GradeType => ({
		code,
		date,
		isNew,
		libelle: code,
		note: 10,
		absence: "",
		comment: "",
		teachers: "",
	});

	it("puts new grades first, then sorts by date descending", () => {
		const input = [
			grade("old", "01/01/2024"),
			grade("recent", "15/03/2025"),
			grade("new-old", "01/09/2023", true),
			grade("mid", "10/12/2024"),
		];

		expect(sortGrades(input).map((g) => g.code)).toEqual([
			"new-old",
			"recent",
			"mid",
			"old",
		]);
	});

	it("does not mutate its input", () => {
		const input = [grade("a", "01/01/2024"), grade("b", "01/01/2025")];
		sortGrades(input);
		expect(input.map((g) => g.code)).toEqual(["a", "b"]);
	});
});

describe("absences helpers", () => {
	it("converts HH:MM durations to hours", () => {
		expect(parseDurationToHours("02:30")).toBe(2.5);
		expect(parseDurationToHours(" 1 : 15 ")).toBe(1.25);
		expect(parseDurationToHours("")).toBe(0);
		expect(parseDurationToHours("abc")).toBe(0);
	});

	it("treats empty and 'Non excusé' motifs as unjustified", () => {
		expect(isUnjustified("")).toBe(true);
		expect(isUnjustified(" Non excusé ")).toBe(true);
		expect(isUnjustified("non excuse")).toBe(true);
		expect(isUnjustified("Certificat médical")).toBe(false);
	});

	it("matches courses by semester and best keyword score", () => {
		const weights = [
			{ Code: "A", Semester: "GIM2", Keywords: ["meca"], FFP: 10 },
			{ Code: "B", Semester: "GIM2", Keywords: ["meca", "solide"], FFP: 10 },
			{ Code: "C", Semester: "GIE2", Keywords: ["meca", "solide"], FFP: 10 },
		];
		expect(matchCourse("GIM2 Méca solide", weights)?.Code).toBe("B");
		expect(matchCourse("GIM2 Anglais", weights)).toBeNull();
		expect(matchCourse("GIM1 Méca solide", weights)).toBeNull();
	});
});

describe("parseAbsencesPage", () => {
	it("parses totals, rows and unjustified hours per UE", () => {
		const parsed = parseAbsencesPage(
			cheerio.load(ABSENCES_PAGE_HTML),
			courseData.course_weights
		);

		expect(parsed.nbTotalAbsences).toBe(3);
		expect(parsed.dureeTotaleAbsences).toBe("06h00");
		expect(parsed.absences).toHaveLength(4);
		expect(parsed.absences[0]).toEqual({
			date: "10/01/2025",
			motif: "Non excusé",
			duree: "02:00",
			horaire: "08h00-10h00",
			cours: "GIM2 Mecanique des solides",
			intervenants: "M. X",
			matiere: "Mécanique",
		});
		expect(parsed.stats).toEqual([
			{
				code: "MDSA",
				name: "Mécanique",
				absentHours: 4.5,
				totalUE: 50,
				percentage: 9,
			},
		]);
	});

	it("returns empty data when Lise reports no absence", () => {
		expect(
			parseAbsencesPage(cheerio.load(NO_ABSENCES_PAGE_HTML), courseData.course_weights)
		).toEqual({
			nbTotalAbsences: 0,
			dureeTotaleAbsences: "00h00",
			absences: [],
			stats: [],
		});
	});

	it("sorts stats by percentage descending", () => {
		const weights = [
			{ Code: "BIG", Semester: "S1", Keywords: ["big"], FFP: 10 },
			{ Code: "SMALL", Semester: "S1", Keywords: ["small"], FFP: 100 },
		];
		const html = `<table><tbody id="form:table_data">
			<tr><td>1</td><td></td><td>01:00</td><td></td><td>S1 small</td><td></td><td>Small</td></tr>
			<tr><td>2</td><td></td><td>01:00</td><td></td><td>S1 big</td><td></td><td>Big</td></tr>
		</tbody></table>`;
		const { stats } = parseAbsencesPage(cheerio.load(html), weights);
		expect(stats.map((s) => s.code)).toEqual(["BIG", "SMALL"]);
	});
});
