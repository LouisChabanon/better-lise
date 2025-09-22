
export type CalendarEventType = "CM" | "EXAMEN" | "TRAVAIL_AUTONOME" | "ED_TD" | "TPS" | "RU" | "PROJET";

export type EventPriority = "low" | "medium" | "high";

export type CalendarEventProps = {
    title: string;
    startDate: Date;
    endDate: Date;
    priority: EventPriority;
    summary?: string;
    room?: string;
    teacher?: string;
    group?: string;
    type?: CalendarEventType;
};