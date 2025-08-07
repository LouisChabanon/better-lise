import { format } from "date-fns";
import { getWeekData } from "@/actions/GetWeekData";
import { useState } from "react";

type CalendarEventType = "CM" | "EXAMEN" | "TRAVAIL_AUTONOME" | "ED_TD" | "TPS" | "RU" | "PROJET";

type CalendarEventProps = {
    title: string;
    summary?: string;
    startDate: Date;
    endDate: Date;
    type?: CalendarEventType;
    room?: string;
    teacher?: string;
    group?: string;
    weekOffset?: number; // Offset for the week, default is 0 (current week)
    info: { position: number, columns: number }; // Additional info for layout
};

const normalizeDate = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

const CalendarEvent = ({ title, summary, startDate, endDate, room, teacher, group, type="CM", weekOffset=0, info
 }: CalendarEventProps) => {

    const [isActive, setIsActive] = useState(false);

    const handleStart = () => setIsActive(true);
    const handleEnd = () => setIsActive(false);

    const startTime = format(startDate, 'HH:mm');
    const endTime = format(endDate, 'HH:mm');

    console.log(title, "Event Start:", startTime, "End:", endTime);

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

    console.log("Client StartDate: ", title, startDate)


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
            eventClass = "bg-amber-200 text-amber-700 hover:bg-amber-200/80";
            eventText = "text-amber-700";
            break;
        case "EXAMEN":
            eventClass = "bg-red-100 text-red-700 hover:bg-red-200";
            eventText = "text-red-500";
            break;
        case "TRAVAIL_AUTONOME":
            eventClass = "bg-pink-100 text-pink-700 hover:bg-pink-200";
            eventText = "text-pink-700";
            break;
        case "TPS":
            eventClass = "bg-blue-200 text-blue-700 hover:bg-blue-200/80";
            eventText = "text-blue-700";
            break;
        case "RU":
            eventClass = "bg-sky-200 text-sky-700 hover:bg-sky-200/80 ";
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
                top: "30%",
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
                    ${eventClass} group text-center  whitespace-normal overflow-hidden break-words
                    ${isActive ? "block w-full h-auto overflow-y-auto max-h-[70hv]" : "absolute inset-1"} flex flex-col rounded-lg p-1 transition-all duration-200 gap-2 
                    ${isActive ? "text-base shadow-2xl p-4 rounded-xl" : "text-[10px] sm:text-sm"}
                    
                    `}>
                <p className="order-1 font-semibold line-clamp-3">{title}</p>
                <p className={`order-2 ${eventText}`}>
                    {type}  { room || ""}
                </p>
                {isActive && (
                    <p className="order-2 mt-2 text-gray-600 whitespace-pre-line">{summary} {teacher || "No teacher specified"} - {group || "No group specified"}</p>
                    
                )}
            </a>
        </li>
    </>
    )
}

export { CalendarEvent };