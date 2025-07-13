

export type CalendarEventType = "CM" | "TEST" | "TEAMS" | "ED" | "TP";

export type CalendarEventProps = {
    title: string;
    startDate: Date;
    endDate: Date;
    type?: CalendarEventType;
};