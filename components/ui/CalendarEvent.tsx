import { format } from "date-fns";
import { getWeekData } from "@/actions/GetWeekData";
import { useState } from "react";
import { tbk } from "@/lib/types";

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
    priority?: "low" | "medium" | "high";
    tbk: tbk;
};

const normalizeDate = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

const CalendarEvent = ({ title, summary, startDate, endDate, room, teacher, group, type="CM", weekOffset=0, info, priority, tbk }: CalendarEventProps) => {

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
    let eventClass = "bg-eventDefaultBg text-eventDefaultText hover:bg-eventDefaultBg/80";
    let eventText = "text-eventDefaultText";
    switch (type) {
        case "CM":
            eventClass = "bg-eventCmBg text-eventCmText hover:bg-eventCmBg/80";
            eventText = "text-eventCmText";
            break;
        case "EXAMEN":
            eventClass = "bg-eventExamBg text-eventExamText hover:bg-eventExamBg/80";
            eventText = "text-eventExamText";
            break;
        case "TRAVAIL_AUTONOME":
            eventClass = "bg-eventAutoBg text-eventAutoText hover:bg-eventAutoBg/80";
            eventText = "text-eventAutoText";
            break;
        case "TPS":
            eventClass = "bg-eventTpBg text-eventTpText hover:eventTpBg/80";
            eventText = "text-eventTpText";
            break;
        case "RU":
            eventClass = "bg-eventRuBg text-eventRuText hover:bg-eventRuBg/80";
            eventText = "text-eventRuText";
            break;
        case "PROJET":
            eventClass = "bg-eventAutoBg text-eventAutoText hover:bg-eventAutoBg/80";
            eventText = "text-eventAutoText";
    }
    
    let width = `${100 / info.columns}%`;
    let left = `${(info.position / info.columns) * 100}%`;
    let zIndex = 0;

    if(priority === "high") {
        width = `100%`;
        left = `${(info.position) * 100}%`;
        zIndex = 10;
    }
    
    
    if (type === "RU") {
        // For RU, we want to display them in a special way
        return (
            <>
            {isActive && (
                <div className="fixed inset-0 bg-backgroundPrimary/30 backdrop-blur-sm z-40 flex items-center justify-center p-4" onClick={handleEnd} />
            )}
            <li className={` overflow-y-auto max-h-[80vh] transition-all duration-200 ease-out ${isActive ? "z-50 fixed select-none touch-none" : `relative col-start-${eventDayISO}`}`} style={{

                ...(isActive ? {
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: "90%",
                    maxWidth: "400px",
                    height: "auto",
                    padding: "1rem",
                }: {
                    gridRow: `${startRow} / span ${span} `,
                    width: `100%`,
                    left: `${(info.position) * 100}%`,
                    position: "relative",
                    zIndex: zIndex,
                })
                }}
                //onTouchStart={handleStart}
                onMouseDown={handleStart}
                
                >
                <a
                    className={`
                        ${eventClass} group items-center justify-center text-center whitespace-normal overflow-hidden break-words
                        ${isActive ? "block w-full h-auto overflow-y-auto max-h-[70hv]" : "absolute inset-1"} flex flex-col rounded-lg p-1 transition-all duration-200 gap-2 
                        ${isActive ? "" : "text-5xl"}
                        `}>
                    {!isActive && (
                        <p className="order-1 font-semibold drop-shadow-md line-clamp-3 text-center self-center">{title}</p>
                    )}
                    {isActive && (
                        <div className="flex flex-col w-full">
                            <p>Menu RU de {tbk}</p>
                            <p className="order-2 mt-2 mb-2 text-gray-600 dark:text-white whitespace-pre-line">{summary}</p>
                        </div>
                    )}
                </a>
            </li>
    </>
    )
}
    return (
        <>
        {isActive && (
            <div className="fixed inset-0 bg-backgroundPrimary/30 backdrop-blur-sm z-40" onClick={handleEnd} />
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
                zIndex: zIndex,
            })
            }}
            //onTouchStart={handleStart}
            onMouseDown={handleStart}
            
            >
            <a
                className={`
                    ${eventClass} group text-center  whitespace-normal overflow-hidden break-words
                    ${isActive ? "block w-full h-auto overflow-y-auto max-h-[70hv]" : "absolute inset-1"} flex flex-col rounded-lg p-1 transition-all duration-200 gap-2 
                    ${isActive ? "text-base shadow-2xl p-4 rounded-xl" : "text-[10px] sm:text-sm"}
                    
                    `}>
                <p className="order-1 font-semibold line-clamp-3">{title.replace(/_/g, " ")}</p>
                <p className={`order-2 ${eventText}`}>
                    {type.replace(/_/g, " ")} - { room?.replace(/_/g, " ") || ""}
                </p>
                {isActive && (
                    <p className="order-2 mt-2 text-gray-600 dark:text-white whitespace-pre-line">{summary} {teacher || "No teacher specified"} - {group || "No group specified"}</p>
                    
                )}
            </a>
        </li>
    </>
    )
}

export { CalendarEvent };