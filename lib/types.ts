
export type CalendarEventType = "CM" | "EXAMEN" | "TRAVAIL_AUTONOME" | "ED_TD" | "TPS" | "RU" | "PROJET";

export type CalendarEventProps = {
    title: string;
    startDate: Date;
    endDate: Date;
    summary?: string;
    room?: string;
    teacher?: string;
    group?: string;
    type?: CalendarEventType;
};

export type GradeType = {
    date: string,
    code: string,
    libelle: string,
    note: number,
    absence: string,
    comment: string,
    teachers: string,
    isNew?: boolean,
}

export type AbsenceType = {
    date: string,
    motif: string,
    cours: string,
    intervenants: string,
    matiere: string,
    horaire: string,
    duree: string,
}

export type tbk = "Chalons" | "Boquette" | "Cluny" | "Birse" | "P3" | "KIN" | "Bordels" | "Sibers";

export type RequestState = {
    errors?: string;
    data?: GradeType[] | AbsenceType[];
    success: boolean;
}
