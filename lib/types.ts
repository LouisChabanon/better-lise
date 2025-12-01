export type CalendarEventType =
	| "CM"
	| "EXAMEN"
	| "TRAVAIL_AUTONOME"
	| "ED_TD"
	| "TPS"
	| "RU"
	| "PROJET";

export type CalendarEventProps = {
	title: string;
	startDate: Date;
	endDate: Date;
	summary?: string;
	room?: string;
	teacher?: string;
	group?: string;
	type?: CalendarEventType;
	isAllDay: boolean;
};

export type GradeType = {
	date: string;
	code: string;
	libelle: string;
	note: number;
	absence: string;
	comment: string;
	teachers: string;
	isNew?: boolean;
};

export type AbsenceType = {
	date: string;
	motif: string;
	cours: string;
	intervenants: string;
	matiere: string;
	horaire: string;
	duree: string;
};

export type tbk =
	| "Chalons"
	| "Boquette"
	| "Cluny"
	| "Birse"
	| "P3"
	| "KIN"
	| "Bordels"
	| "Sibers";

export type RequestState = {
	errors?: string;
	data?: GradeType[];
	success: boolean;
};

export type AbsenceStatType = {
	code: string;
	name: string;
	absentHours: number;
	totalUE: number;
	percentage: number;
};

export type AbsencesRequestState = {
	errors?: string;
	success: boolean;
	data?: {
		nbTotalAbsences: number;
		dureeTotaleAbsences: string;
		absences?: AbsenceType[];
		stats?: AbsenceStatType[];
	};
};

export type GradeDetailType = {
	errors?: string;
	data?: {
		avg: number;
		min: number;
		max: number;
		count: number;
		median: number;
		stdDeviation: number;
		distribution: {
			labels: string[];
			counts: number[];
		};
	};
};

export type SimulatedGrade = {
	id: string;
	name: string;
	grade: number;
	coeff: number;
	classCode: string;
};

export type RealGradeWithCoeff = GradeType & {
	coeff: number;
	isCommunity: boolean;
};

export type ClassGroup = {
	semester: string;
	classCode: string;
	real: RealGradeWithCoeff[];
	sim: SimulatedGrade[];
};
