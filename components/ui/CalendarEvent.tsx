import { format } from "date-fns";
import { getWeekData } from "@/actions/GetWeekData";
import { useState } from "react";

type CalendarEventType = "CM" | "TEST" | "TEAMS" | "ED" | "TP" | "RU";

type CalendarEventProps = {
    title: string;
    summary?: string;
    startDate: Date;
    endDate: Date;
    type?: CalendarEventType;
    weekOffset?: number; // Offset for the week, default is 0 (current week)
    info: { position: number, columns: number }; // Additional info for layout
};

const normalizeDate = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

const CalendarEvent = ({ title, summary, startDate, endDate, type="CM", weekOffset=0, info
 }: CalendarEventProps) => {

    const [isActive, setIsActive] = useState(false);

    const handleStart = () => setIsActive(true);
    const handleEnd = () => setIsActive(false);

    const startTime = format(startDate, 'HH:mm');
    const endTime = format(endDate, 'HH:mm');

    const eventDay = startDate.getDay();
    const eventDayISO = eventDay === 0 ? 7 : eventDay;

    const calendarStartTime = 7;

    const getMinutesFromStart = (date: Date) => {
       return (date.getHours() - calendarStartTime) * 60 + date.getMinutes();
    };

    const startOffset = getMinutesFromStart(startDate);
    const endOffset = getMinutesFromStart(endDate);

    const startRow = Math.floor(startOffset / 5) + 1;
    const span = Math.max(1, Math.ceil((endOffset - startOffset) / 5));


    if (eventDayISO < 1 || eventDayISO > 5) {
        // If the event is on a weekend, we don't display it in the agenda
        return null;
    }

    //Check if the event is in current week
    const currentWeedData = getWeekData(weekOffset);

    const eventDate = normalizeDate(startDate);
    const weekstart = normalizeDate(currentWeedData.weekDates[0]);
    const weekend = normalizeDate(currentWeedData.weekDates[4]);

    if ((new Date(eventDate)) < (new Date(weekstart)) || (new Date(eventDate)) > (new Date(weekend))) {
        return null;
    }

    // Apply styling based on event type
    let eventClass = "bg-primary-container text-primary hover:bg-primary-container/80";
    let eventText = "text-on-primary";
    switch (type) {
        case "CM":
            eventClass = "bg-secondary-container text-secondary hover:bg-secondary-container/80";
            eventText = "text-on-secondary";
            break;
        case "TEST":
            eventClass = "bg-red-100 text-red-700 hover:bg-red-200";
            eventText = "text-red-500";
            break;
        case "TEAMS":
            eventClass = "bg-purple-100 text-purple-700 hover:bg-purple-200";
            eventText = "text-purple-500";
            break;
        case "TP":
            eventClass = "bg-green-50 text-green-700 hover:bg-green-100";
            eventText = "text-green-500";
            break;
        case "RU":
            eventClass = "bg-sky-200 text-sky-700 hover:bg-sky-200";
            eventText = "text-on-secondary";
            break;
    }
    
    const width = `${100 / info.columns}%`;
    const left = `${(info.position / info.columns) * 100}%`;
    
    
    return (
        <>
        {isActive && (
            <div className="fixed inset-0 bg-white/30 backdrop-blur-sm z-40" onClick={handleEnd} />
        )}
        <li className={` transition-all duration-200 ease-out ${isActive ? "z-50 fixed select-none touch-none" : `relative col-start-${eventDayISO}`}`} style={{

            ...(isActive ? {
                top: "10%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: "90%",
                maxWidth: "400px",
                height: "auto",
                padding: "1rem",
            }: {
                gridRow: `${startRow} / span ${span} `,
                width: width,
                left: left,
                position: "relative",
            })
            }}
            onTouchStart={handleStart}
            onTouchEnd={handleEnd}
            onTouchCancel={handleEnd}
            onMouseDown={handleStart}
            onMouseUp={handleEnd}
            
            >
            <a
                className={`
                    ${eventClass} group
                    ${isActive ? "block w-full h-auto overflow-y-auto max-h-[70hv]" : "absolute inset-1"} flex flex-col rounded-lg p-2 leading-5 transition-all duration-200 
                    ${isActive ? "text-base shadow-2xl p-4 rounded-xl" : "text-sm"}`}>
                <p className="order-1 font-semibold">{title}</p>
                <p className={eventText + " text-xs"}>
                    <time dateTime={startDate.toISOString()}>{startTime}</time> -{" "}<time dateTime={endDate.toISOString()}>{endTime}</time>
                </p>
                {summary && (
                    <p className="order-2 mt-1 text-gray-600">{summary.split(" ")[0]}</p>
                )}
                {isActive && summary && (
                    <p className="order-2 mt-2 text-gray-600 whitespace-pre-line">{summary}</p>
                )}
            </a>
        </li>
    </>
    )
}

export { CalendarEvent };