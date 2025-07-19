

export type CalendarEventType = "CM" | "TEST" | "TEAMS" | "ED" | "TP" | "RU";

export type CalendarEventProps = {
    title: string;
    startDate: Date;
    endDate: Date;
    summary?: string;
    type?: CalendarEventType;
};