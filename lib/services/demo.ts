import { createHash, timingSafeEqual } from "node:crypto";
import { addDays, format, startOfWeek, subDays } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import courseData from "@/ue_data.json";
import {
	computeAbsenceStats,
	parseDurationToHours,
	ParsedAbsences,
} from "@/lib/parsers/absences";
import {
	AbsenceType,
	CalendarEventProps,
	CalendarEventType,
	GradeType,
} from "@/lib/types";

// Review account for the App Store and Google Play: it signs in without Lise and only ever
// sees the fixtures below. Its grade codes use their own prefix so they never mix with the
// statistics of real students.
export const DEMO_USERNAME = "0000-0000";
export const DEMO_SESSION_ID = "demo-session";

const DEMO_CODE_PREFIX = "DEMO_";
const PARIS_TZ = "Europe/Paris";

export const isDemoUsername = (username: string | null | undefined) =>
	username === DEMO_USERNAME;

export const isDemoGradeCode = (code: string) =>
	code.startsWith(DEMO_CODE_PREFIX);

/** The demo account is disabled unless DEMO_ACCOUNT_PASSWORD is set. */
export function isDemoPasswordValid(password: string): boolean {
	const expected = process.env.DEMO_ACCOUNT_PASSWORD;
	if (!expected || !password) return false;
	// Hashing first gives equal-length buffers, as timingSafeEqual requires
	const digest = (value: string) => createHash("sha256").update(value).digest();
	return timingSafeEqual(digest(password), digest(expected));
}

type DemoGrade = Omit<GradeType, "date" | "absence"> & { daysAgo: number };

// A GIM2 student between S7 and S8. The two most recent grades are unopened so the
// casino reveal can be shown right after signing in.
const DEMO_GRADES: DemoGrade[] = [
	{
		daysAgo: 2,
		code: "DEMO_S8_REPA_TP2",
		libelle: "TP Réaliser un produit",
		note: 17.5,
		comment: "",
		teachers: "M. Laurent",
		isNew: true,
	},
	{
		daysAgo: 3,
		code: "DEMO_S8_ORIA_EXAM",
		libelle: "Examen Organiser l'industrialisation",
		note: 12,
		comment: "",
		teachers: "Mme Petit",
		isNew: true,
	},
	{
		daysAgo: 9,
		code: "DEMO_S8_COPA_DS1",
		libelle: "DS Concevoir un produit",
		note: 9.5,
		comment: "Revoir la cotation fonctionnelle",
		teachers: "M. Girard",
		isNew: false,
	},
	{
		daysAgo: 60,
		code: "DEMO_S7_PJ7_SOUT",
		libelle: "Soutenance de projet",
		note: 15.5,
		comment: "Très bonne présentation",
		teachers: "Mme Roux",
		isNew: false,
	},
	{
		daysAgo: 75,
		code: "DEMO_S7_ANS7_ORAL",
		libelle: "Anglais - Oral",
		note: 16,
		comment: "",
		teachers: "Mrs Smith",
		isNew: false,
	},
	{
		daysAgo: 90,
		code: "DEMO_S7_SGEA_EXAM",
		libelle: "Examen Gestion de l'entreprise",
		note: 11,
		comment: "",
		teachers: "M. Fontaine",
		isNew: false,
	},
	{
		daysAgo: 100,
		code: "DEMO_S7_MDSA_PROJ",
		libelle: "Projet Mécanique des solides",
		note: 13.5,
		comment: "",
		teachers: "M. Morel",
		isNew: false,
	},
	{
		daysAgo: 110,
		code: "DEMO_S7_MDSA_DS1",
		libelle: "DS Mécanique des solides",
		note: 8.75,
		comment: "",
		teachers: "M. Morel",
		isNew: false,
	},
	{
		daysAgo: 120,
		code: "DEMO_S7_MATA_TP1",
		libelle: "TP Matériaux",
		note: 16,
		comment: "",
		teachers: "Mme Bernard",
		isNew: false,
	},
	{
		daysAgo: 125,
		code: "DEMO_S7_MATA_DS1",
		libelle: "DS Matériaux",
		note: 14.5,
		comment: "",
		teachers: "Mme Bernard",
		isNew: false,
	},
];

export function demoGrades(now: Date): GradeType[] {
	return DEMO_GRADES.map(({ daysAgo, ...grade }) => ({
		...grade,
		absence: "",
		date: format(subDays(now, daysAgo), "dd/MM/yyyy"),
	}));
}

const MIN_CLASS_SIZE = 38;
const CLASS_SIZE_SPREAD = 20;
const CLASS_AVERAGE = 12;

/** Grades of imaginary classmates, stable for a given code so the charts don't change between visits. */
export function demoClassmateGrades(code: string): number[] {
	let seed = createHash("sha256").update(code).digest().readUInt32LE(0);
	const random = () => {
		seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
		return seed / 2 ** 32;
	};

	const ownNote =
		DEMO_GRADES.find((g) => g.code === code)?.note ?? CLASS_AVERAGE;
	const mean = (ownNote + CLASS_AVERAGE) / 2;
	const count = MIN_CLASS_SIZE + Math.floor(random() * CLASS_SIZE_SPREAD);

	return Array.from({ length: count }, () => {
		// Sum of three uniforms: roughly bell-shaped, within ±9 points of the mean
		const offset = (random() + random() + random() - 1.5) * 6;
		const note = Math.min(20, Math.max(0, mean + offset));
		return Math.round(note * 4) / 4;
	});
}

type DemoAbsence = Omit<AbsenceType, "date"> & { daysAgo: number };

// `cours` follows Lise's wording so the UE matching of real absences applies
const DEMO_ABSENCES: DemoAbsence[] = [
	{
		daysAgo: 4,
		motif: "Non excusé",
		duree: "02:00",
		horaire: "08h00-10h00",
		cours: "GIM2 Mecanique des solides CM",
		intervenants: "M. Morel",
		matiere: "Mécanique des solides",
	},
	{
		daysAgo: 11,
		motif: "",
		duree: "03:00",
		horaire: "13h30-16h30",
		cours: "GIM2 Realiser un produit TP",
		intervenants: "M. Laurent",
		matiere: "Réaliser un produit",
	},
	{
		daysAgo: 18,
		motif: "Certificat médical",
		duree: "04:00",
		horaire: "08h00-12h00",
		cours: "GIM2 Materiaux TD",
		intervenants: "Mme Bernard",
		matiere: "Matériaux",
	},
	{
		daysAgo: 25,
		motif: "Non excusé",
		duree: "01:30",
		horaire: "10h15-11h45",
		cours: "S7 Anglais",
		intervenants: "Mrs Smith",
		matiere: "Anglais",
	},
	{
		daysAgo: 32,
		motif: "",
		duree: "02:00",
		horaire: "10h15-12h15",
		cours: "GIM2 Mecanique des solides TD",
		intervenants: "M. Morel",
		matiere: "Mécanique des solides",
	},
];

const formatTotalDuration = (hours: number) => {
	const minutes = Math.round(hours * 60);
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${pad(Math.floor(minutes / 60))}h${pad(minutes % 60)}`;
};

export function demoAbsences(now: Date): ParsedAbsences {
	const absences: AbsenceType[] = DEMO_ABSENCES.map(
		({ daysAgo, ...absence }) => ({
			...absence,
			date: format(subDays(now, daysAgo), "dd/MM/yyyy"),
		}),
	);
	const totalHours = absences.reduce(
		(sum, a) => sum + parseDurationToHours(a.duree),
		0,
	);

	return {
		nbTotalAbsences: absences.length,
		dureeTotaleAbsences: formatTotalDuration(totalHours),
		absences,
		stats: computeAbsenceStats(absences, courseData.course_weights),
	};
}

type DemoSlot = {
	weekday: number; // 0 = Monday
	start: string;
	end: string;
	title: string;
	type: CalendarEventType;
	room: string;
	teacher: string;
	weekOffset?: number; // only on that week, relative to the current one
};

const DEMO_WEEK: DemoSlot[] = [
	{
		weekday: 0,
		start: "08:00",
		end: "10:00",
		title: "Mécanique des solides",
		type: "CM",
		room: "Amphi 1",
		teacher: "M. Morel",
	},
	{
		weekday: 0,
		start: "10:15",
		end: "12:15",
		title: "Matériaux",
		type: "ED_TD",
		room: "Salle B204",
		teacher: "Mme Bernard",
	},
	{
		weekday: 0,
		start: "13:30",
		end: "17:30",
		title: "Réaliser un produit",
		type: "TPS",
		room: "Atelier usinage",
		teacher: "M. Laurent",
	},
	{
		weekday: 1,
		start: "08:00",
		end: "12:00",
		title: "Projet S8",
		type: "PROJET",
		room: "Plateau projet",
		teacher: "Mme Roux",
	},
	{
		weekday: 1,
		start: "14:00",
		end: "16:00",
		title: "Gestion de l'entreprise",
		type: "CM",
		room: "Amphi 2",
		teacher: "M. Fontaine",
	},
	{
		weekday: 2,
		start: "08:00",
		end: "10:00",
		title: "Concevoir un produit",
		type: "CM",
		room: "Amphi 1",
		teacher: "M. Girard",
	},
	{
		weekday: 2,
		start: "10:15",
		end: "11:45",
		title: "Anglais",
		type: "ED_TD",
		room: "Salle A102",
		teacher: "Mrs Smith",
	},
	{
		weekday: 2,
		start: "13:30",
		end: "16:30",
		title: "Projet S8",
		type: "TRAVAIL_AUTONOME",
		room: "Bibliothèque",
		teacher: "Mme Roux",
	},
	{
		weekday: 3,
		start: "08:00",
		end: "10:00",
		title: "Organiser l'industrialisation",
		type: "CM",
		room: "Amphi 2",
		teacher: "Mme Petit",
	},
	{
		weekday: 3,
		start: "10:15",
		end: "12:15",
		title: "Mécanique des solides",
		type: "ED_TD",
		room: "Salle B112",
		teacher: "M. Morel",
	},
	{
		weekday: 3,
		start: "13:30",
		end: "15:30",
		title: "Matériaux",
		type: "TPS",
		room: "Labo matériaux",
		teacher: "Mme Bernard",
	},
	{
		weekday: 4,
		start: "08:00",
		end: "10:00",
		title: "Concevoir un produit",
		type: "ED_TD",
		room: "Salle C010",
		teacher: "M. Girard",
	},
	{
		weekday: 4,
		start: "10:15",
		end: "12:15",
		title: "DS Mécanique des solides",
		type: "EXAMEN",
		room: "Amphi 1",
		teacher: "M. Morel",
		weekOffset: 1,
	},
];

// Last week to four weeks ahead, enough to swipe through the agenda
const DEMO_WEEK_OFFSETS = [-1, 0, 1, 2, 3, 4];

export function demoCalendarEvents(now: Date): CalendarEventProps[] {
	const monday = startOfWeek(toZonedTime(now, PARIS_TZ), { weekStartsOn: 1 });

	return DEMO_WEEK_OFFSETS.flatMap((offset) =>
		DEMO_WEEK.filter(
			(slot) => slot.weekOffset === undefined || slot.weekOffset === offset,
		).map((slot) => {
			const day = format(
				addDays(monday, offset * 7 + slot.weekday),
				"yyyy-MM-dd",
			);
			return {
				title: slot.title,
				startDate: fromZonedTime(`${day}T${slot.start}:00`, PARIS_TZ),
				endDate: fromZonedTime(`${day}T${slot.end}:00`, PARIS_TZ),
				room: slot.room,
				teacher: slot.teacher,
				group: "GIM2 - G1",
				type: slot.type,
				isAllDay: false,
			};
		}),
	);
}
