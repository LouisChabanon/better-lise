import { createHash } from "crypto";
import ical, { ICalCalendarMethod } from "ical-generator";
import { CalendarEventProps } from "@/lib/types";

// Ask well-behaved clients (Apple, Outlook, Thunderbird) to refresh hourly.
// Google Calendar ignores this and refreshes on its own schedule (~12-24h).
const REFRESH_TTL_SECONDS = 3600;

// Placeholders set by GetCalendar when Lise omits a field
const PLACEHOLDERS = new Set([
	"No room specified",
	"No teacher specified",
	"No group specified",
]);

const TYPE_LABELS: Record<string, string> = {
	CM: "CM",
	ED_TD: "TD",
	TPS: "TP",
	TRAVAIL_AUTONOME: "Travail autonome",
	PROJET: "Projet",
	EXAMEN: "Examen",
	RU: "RU",
};

export type IcsEventFields = {
	summary: string;
	description: string;
	location: string;
	categories: string[];
};

function clean(value: string | undefined): string {
	if (!value || PLACEHOLDERS.has(value)) return "";
	return value.replace(/_/g, " ").trim();
}

function typeLabel(type: string | undefined): string {
	if (!type) return "";
	return TYPE_LABELS[type] ?? type.replace(/_/g, " ");
}

export function formatEventForIcs(ev: CalendarEventProps): IcsEventFields {
	if (ev.type === "RU") {
		return {
			summary: "RU",
			description: ev.summary ?? "",
			location: "",
			categories: ["RU"],
		};
	}

	const title = clean(ev.title) || "Cours";
	const label = typeLabel(ev.type);
	const isExam = ev.type === "EXAMEN" || ev.type?.includes("TEST");

	const summary = isExam
		? `EXAMEN – ${title}`
		: label
			? `[${label}] ${title}`
			: title;

	const description = [
		`Intervenant : ${clean(ev.teacher) || "Non assigné"}`,
		`Groupe : ${clean(ev.group) || "Non spécifié"}`,
		`Type : ${label || "Non spécifié"}`,
	].join("\n");

	return {
		summary,
		description,
		location: clean(ev.room),
		categories: label ? [label] : [],
	};
}

function fallbackUid(ev: CalendarEventProps): string {
	const hash = createHash("sha1")
		.update(`${ev.title}|${ev.startDate.toISOString()}|${ev.group ?? ""}`)
		.digest("hex");
	return `${hash}@better-lise`;
}

export function buildIcsCalendar(
	events: CalendarEventProps[],
	opts: { liseId: string },
): string {
	const calendar = ical({
		name: `Better-Lise – ${opts.liseId}`,
		description: "Emploi du temps Lise mis en forme par Better-Lise",
		prodId: { company: "Better-Lise", product: "agenda", language: "FR" },
		method: ICalCalendarMethod.PUBLISH,
		ttl: REFRESH_TTL_SECONDS,
		x: [{ key: "X-WR-TIMEZONE", value: "Europe/Paris" }],
	});

	for (const ev of events) {
		const fields = formatEventForIcs(ev);
		// Times are emitted in UTC; Lise "all-day" blocks are really long timed
		// sessions, so we keep their actual start/end.
		calendar.createEvent({
			id: ev.uid ?? fallbackUid(ev),
			start: ev.startDate,
			end: ev.endDate,
			summary: fields.summary,
			description: fields.description,
			location: fields.location || null,
			categories: fields.categories.map((name) => ({ name })),
		});
	}

	return calendar.toString();
}
