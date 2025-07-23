
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