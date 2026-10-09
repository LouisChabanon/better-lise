import type { CheerioAPI } from "cheerio";
import { AbsenceStatType, AbsenceType } from "@/lib/types";

export type CourseWeight = {
	Code: string;
	Semester: string;
	Keywords: string[];
	FFP: number;
};

export type ParsedAbsences = {
	nbTotalAbsences: number;
	dureeTotaleAbsences: string;
	absences: AbsenceType[];
	stats: AbsenceStatType[];
};

const NO_ABSENCE_ROW = "Aucune absence.";

export const parseDurationToHours = (durationStr: string): number => {
	if (!durationStr) return 0;
	const str = durationStr.toLowerCase().replace(/\s/g, "");
	const [hoursStr, minutesStr] = str.split(":");
	const hours = parseInt(hoursStr, 10) || 0;
	const minutes = parseInt(minutesStr, 10) || 0;
	return hours + minutes / 60;
};

const normalize = (str: string) =>
	str
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase();

// Keyword matching has many edge cases, so candidates are scored:
// reward matched keywords (and their length), penalise missed ones.
const scoreCourse = (course: CourseWeight, normalizedCours: string) =>
	course.Keywords.reduce(
		(acc, k) => {
			if (normalizedCours.includes(normalize(k))) {
				return { score: acc.score + 10 + k.length, matches: acc.matches + 1 };
			}
			return { score: acc.score - 5, matches: acc.matches };
		},
		{ score: 0, matches: 0 },
	);

export function matchCourse(
	cours: string,
	courseWeights: CourseWeight[],
): CourseWeight | null {
	const normalizedCours = normalize(cours);
	let best: CourseWeight | null = null;
	let bestScore = -Infinity;

	for (const course of courseWeights) {
		if (!cours.includes(course.Semester)) continue;
		const { score, matches } = scoreCourse(course, normalizedCours);
		if (matches === 0) continue;
		if (score > bestScore) {
			best = course;
			bestScore = score;
		}
	}
	return best;
}

// LISE fills motif with "Non excusé" instead of leaving it empty,
// so it must explicitly be treated as unjustified.
export const isUnjustified = (motif: string) => {
	const motifLower = (motif || "").trim().toLowerCase();
	return (
		!motifLower || motifLower === "non excusé" || motifLower === "non excuse"
	);
};

/** Parses Lise's "Mes absences" page (#form:table) and computes per-UE stats. */
export function parseAbsencesPage(
	$page: CheerioAPI,
	courseWeights: CourseWeight[],
): ParsedAbsences {
	const nbText = $page("#form\\:nbrAbs").text();
	const dureeText = $page("#form\\:dureeAbs").text();
	const nbTotalAbsences = nbText !== "" ? parseInt(nbText) : 0;
	const dureeTotaleAbsences = dureeText !== "" ? dureeText : "00h00";

	const absences: AbsenceType[] = [];

	$page("#form\\:table_data > tr").each((_, element) => {
		const cells = $page(element).find("td");
		const cell = (idx: number) => $page(cells.eq(idx)).text().trim();

		const row: AbsenceType = {
			date: cell(0),
			motif: cell(1),
			duree: cell(2),
			horaire: cell(3),
			cours: cell(4),
			intervenants: cell(5),
			matiere: cell(6),
		};

		if (row.date === NO_ABSENCE_ROW) return;
		absences.push(row);
	});

	const stats = computeAbsenceStats(absences, courseWeights);
	return { nbTotalAbsences, dureeTotaleAbsences, absences, stats };
}

/** Unjustified hours per UE, as a share of the UE's face-to-face hours (highest first). */
export function computeAbsenceStats(
	absences: AbsenceType[],
	courseWeights: CourseWeight[],
): AbsenceStatType[] {
	const hoursMap: Record<string, { totalHours: number; name: string }> = {};

	for (const row of absences) {
		const match = matchCourse(row.cours, courseWeights);
		if (!match || !isUnjustified(row.motif)) continue;

		const previous = hoursMap[match.Code];
		hoursMap[match.Code] = {
			totalHours: (previous?.totalHours ?? 0) + parseDurationToHours(row.duree),
			name: previous?.name ?? row.matiere,
		};
	}

	return Object.entries(hoursMap)
		.flatMap(([code, accumulated]) => {
			const ref = courseWeights.find((c) => c.Code === code);
			if (!ref) return [];
			return [
				{
					code,
					name: accumulated.name,
					absentHours: accumulated.totalHours,
					totalUE: ref.FFP,
					percentage: (accumulated.totalHours / ref.FFP) * 100,
				},
			];
		})
		.sort((a, b) => b.percentage - a.percentage);
}
