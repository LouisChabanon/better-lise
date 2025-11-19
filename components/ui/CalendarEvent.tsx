"use client";
import { getWeekData } from "@/actions/GetWeekData";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { tbk } from "@/lib/types";
import posthog from "posthog-js";
import { motion, AnimatePresence } from "framer-motion";

type CalendarEventType = "CM" | "EXAMEN" | "TRAVAIL_AUTONOME" | "ED_TD" | "TPS" | "RU" | "PROJET" | "TEST";

type CalendarEventProps = {
    title: string;
    summary?: string;
    startDate: Date;
    endDate: Date;
    type?: CalendarEventType;
    room?: string;
    teacher?: string;
    group?: string;
    weekOffset?: number;
    info: { position: number, columns: number };
    tbk: tbk;
    isAllDay: boolean;
};

const normalizeDate = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

const getColStartClass = (dayIso: number) => {
    const map: Record<number, string> = {
        1: "col-start-1",
        2: "col-start-2",
        3: "col-start-3",
        4: "col-start-4",
        5: "col-start-5",
        6: "col-start-6",
        7: "col-start-7",
    };
    return map[dayIso] || "col-start-1";
};

const CalendarEvent = ({ title, summary, startDate, endDate, room, teacher, group, type="CM", weekOffset=0, info, tbk, isAllDay }: CalendarEventProps) => {

    const [isActive, setIsActive] = useState(false);

    const handleStart = () => setIsActive(true);
    const handleEnd = () => setIsActive(false);

    const eventDay = startDate.getDay();
    const eventDayISO = eventDay === 0 ? 7 : eventDay;

    // FIXED: Changed from 7 to 8 to match the Agenda grid start time
    const calendarStartTime = 7;

    const getMinutesFromStart = (date: Date) => {
        return (date.getHours() - calendarStartTime) * 60 + date.getMinutes();
    };

    useEffect(() => {
        if(isActive && type == "RU"){
            if (posthog.has_opted_in_capturing()){
                posthog.capture('RU_display_event', {tbk: tbk, date: startDate})
            }
        }
    },[isActive, posthog, tbk, startDate, type]);

    const startOffset = getMinutesFromStart(startDate);
    const endOffset = getMinutesFromStart(endDate);

    // Grid rows are calculated in 5-minute increments
    const startRow = Math.floor(startOffset / 5) + 1;
    const span = Math.max(1, Math.ceil((endOffset - startOffset) / 5));

    if (isAllDay){
        return null
    }

    if (eventDayISO < 1 || eventDayISO > 5) {
        return null;
    }

    const currentWeedData = getWeekData(weekOffset);
    const eventDate = normalizeDate(startDate);
    const weekstart = normalizeDate(currentWeedData.weekDates[0]);
    const weekend = normalizeDate(currentWeedData.weekDates[4]);

    if ((new Date(eventDate)) < (new Date(weekstart)) || (new Date(eventDate)) > (new Date(weekend))) {
        return null;
    }

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
        case "TEST":
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
    let zIndex = info.columns > 1 ? 10 + info.position : 1;

    const inactiveAClasses = type === "RU" ? "text-5xl" : "text-[10px] sm:text-sm";
    
    return (
        <>
            <li
                className={`relative flex ml-1 mr-1 ${getColStartClass(eventDayISO)} pointer-events-none`}
                style={{
                    gridRow: `${startRow} / span ${span}`,
                    marginTop: "2px", 
                    marginBottom: "2px"
                }}
            >
                {/* Inner container for positioning overlaps */}
                <a
                    className={`
                        ${eventClass} group items-center justify-center text-center whitespace-normal overflow-hidden break-words
                        absolute flex flex-col rounded-lg p-1 transition-all duration-200 gap-2 
                        cursor-pointer pointer-events-auto border border-white/10 shadow-sm
                        ${inactiveAClasses}
                    `}
                    style={{
                        top: 0,
                        bottom: 0,
                        left: left,
                        width: width,
                        zIndex: zIndex
                    }}
                    onMouseDown={handleStart}
                >
                    {type === "RU" ? (
                        <p className="order-1 font-semibold drop-shadow-md line-clamp-3 text-center self-center">{title}</p>
                    ) : (
                        <>
                            <p className="order-1 font-semibold line-clamp-3 leading-tight">{title.replace(/_/g, " ")}</p>
                            <p className={`order-2 ${eventText} text-[9px] sm:text-xs opacity-90`}>
                                {type.replace(/_/g, " ")} {room ? ` - ${room.replace(/_/g, " ")}` : ""}
                            </p>
                        </>
                    )}
                </a>
            </li>

            {createPortal(
                <AnimatePresence>
                    {isActive && (
                        <>
                            <motion.div
                                className="fixed inset-0 bg-backgroundPrimary/30 backdrop-blur-sm z-40"
                                onClick={handleEnd}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0, pointerEvents: 'none' }}
                                transition={{ duration: 0.15, ease: "easeOut" }}
                            />

                            <motion.div
                                className={`fixed z-50 w-[90%] max-w-[400px] rounded-xl overflow-y-auto p-6 shadow-2xl
                                    ${type === "RU" ? "max-h-[80vh]" : ""}
                                    ${eventClass} 
                                `}
                                style={{
                                    top: "50%",
                                    left: "50%",
                                }}
                                initial={{ opacity: 0, scale: 0.85, x: "-50%", y: "-50%" }}
                                animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
                                exit={{ opacity: 0, scale: 0.85, x: "-50%", y: "-50%", pointerEvents: "none" }}
                                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                            >
                                {type === "RU" ? (
                                    <div className="flex flex-col w-full">
                                        <h3 className="text-lg font-bold mb-2">Menu RU de {tbk}</h3>
                                        <p className="text-gray-600 dark:text-white/90 whitespace-pre-line leading-relaxed">{summary}</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-3">
                                        <div>
                                            <h3 className="text-xl font-bold leading-snug">{title.replace(/_/g, " ")}</h3>
                                            <p className={`text-sm font-medium opacity-90 mt-1`}>
                                                {type.replace(/_/g, " ")} - {room?.replace(/_/g, " ") || "Sans salle"}
                                            </p>
                                        </div>
                                        <div className="h-px bg-current opacity-20 my-1" />
                                        <div className="space-y-2 text-sm">
                                            <p><strong>Professeur:</strong> {teacher || "Non assigné"}</p>
                                            <p><strong>Groupe:</strong> {group || "Non spécifié"}</p>
                                            <p><strong>Horaire:</strong> {startDate.getHours()}h{startDate.getMinutes().toString().padStart(2, '0')} - {endDate.getHours()}h{endDate.getMinutes().toString().padStart(2, '0')}</p>
                                        </div>
                                        {summary && <p className="mt-2 opacity-80 whitespace-pre-line text-sm">{summary}</p>}
                                    </div>
                                )}
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </>
    )
}

export { CalendarEvent };