import type { CheerioAPI } from "cheerio";
import { GradeType } from "@/lib/types";

export type ParsedGrades = {
	grades: GradeType[];
	skippedRows: number;
};

/** Parses Lise's "Mes notes" table (#form:dataTableFavori). */
export function parseGradesTable($table: CheerioAPI): ParsedGrades {
	const grades: GradeType[] = [];
	let skippedRows = 0;

	$table("#form\\:dataTableFavori_data > tr").each((_, element) => {
		const cells = $table(element).find("td");

		const clean = (idx: number) =>
			$table(cells.eq(idx))
				.clone()
				.find("ui-column-title")
				.remove()
				.end()
				.text()
				.trim();

		const row: GradeType = {
			date: clean(0),
			code: clean(1),
			libelle: clean(2),
			note: parseFloat(clean(3).replace(",", ".")), // French locale commas
			absence: clean(4),
			comment: clean(5),
			teachers: clean(6),
		};

		if (row.date && row.code && row.libelle && !isNaN(row.note)) {
			grades.push(row);
		} else {
			skippedRows++;
		}
	});

	return { grades, skippedRows };
}

const toTimestamp = (date: string) => {
	const [day, month, year] = date.split("/").map(Number);
	return new Date(year, month - 1, day).getTime();
};

/** New grades first, then most recent (dd/MM/yyyy) first. */
export function sortGrades(grades: GradeType[]): GradeType[] {
	return [...grades].sort((a, b) => {
		const aIsNew = !!a.isNew;
		const bIsNew = !!b.isNew;
		if (aIsNew !== bIsNew) return aIsNew ? -1 : 1;
		return toTimestamp(b.date) - toTimestamp(a.date);
	});
}
