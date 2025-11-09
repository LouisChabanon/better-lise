"use client";
import { getWeekData } from "@/actions/GetWeekData";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { tbk } from "@/lib/types";
import posthog from "posthog-js";
import { motion, AnimatePresence } from "framer-motion";

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
    weekOffset?: number;
    info: { position: number, columns: number };
    tbk: tbk;
    isAllDay: boolean;
};

const normalizeDate = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

const CalendarEvent = ({ title, summary, startDate, endDate, room, teacher, group, type="CM", weekOffset=0, info, tbk, isAllDay }: CalendarEventProps) => {

    const [isActive, setIsActive] = useState(false);

    const handleStart = () => setIsActive(true);
    const handleEnd = () => setIsActive(false);

    const eventDay = startDate.getDay();
    const eventDayISO = eventDay === 0 ? 7 : eventDay;

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

    // --- Define inactive styles ---
    const inactiveAClasses = type === "RU" ? "text-5xl" : "text-[10px] sm:text-sm";
    
    return (
        <>
            {/* 1. The In-Grid Click Target */}
            <li
                className={`relative col-start-${eventDayISO} cursor-pointer`}
                style={{
                    gridRow: `${startRow} / span ${span}`,
                    width: width,
                    left: left,
                    zIndex: zIndex,
                }}
                onMouseDown={handleStart}
            >
                <a
                    className={`
                        ${eventClass} group items-center justify-center text-center whitespace-normal overflow-hidden break-words
                        absolute inset-1 flex flex-col rounded-lg p-1 transition-all duration-200 gap-2 
                        ${inactiveAClasses}
                    `}
                >
                    {/* Inactive Content */}
                    {type === "RU" ? (
                        <p className="order-1 font-semibold drop-shadow-md line-clamp-3 text-center self-center">{title}</p>
                    ) : (
                        <>
                            <p className="order-1 font-semibold line-clamp-3">{title.replace(/_/g, " ")}</p>
                            <p className={`order-2 ${eventText}`}>
                                {type.replace(/_/g, " ")} - {room?.replace(/_/g, " ") || ""}
                            </p>
                        </>
                    )}
                </a>
            </li>

            {/* 2. The Portal for the Modal */}
            {createPortal(
                <AnimatePresence>
                    {isActive && (
                        <>
                            {/* A. The Overlay */}
                            <motion.div
                                className="fixed inset-0 bg-backgroundPrimary/30 backdrop-blur-sm z-40"
                                onClick={handleEnd}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0, pointerEvents: 'none' }}
                                transition={{ duration: 0.15, ease: "easeOut" }}
                            />

                            {/* B. The Modal Content */}
                            <motion.div
                                className={`fixed z-50 w-[90%] max-w-[400px] rounded-xl overflow-y-auto p-4
                                    ${type === "RU" ? "max-h-[80vh]" : ""}
                                    ${eventClass} // Apply event color to the modal background
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
                                {/* Active Content */}
                                {type === "RU" ? (
                                    <div className="flex flex-col w-full">
                                        <p>Menu RU de {tbk}</p>
                                        <p className="order-2 mt-2 mb-2 text-gray-600 dark:text-white whitespace-pre-line">{summary}</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-2 text-base">
                                        <p className="order-1 font-semibold line-clamp-3">{title.replace(/_/g, " ")}</p>
                                        <p className={`order-2 ${eventText}`}>
                                            {type.replace(/_/g, " ")} - {room?.replace(/_/g, " ") || ""}
                                        </p>
                                        <p className="order-2 mt-2 text-gray-600 dark:text-white whitespace-pre-line">
                                            {summary} {teacher || "Aucun professeur assigné"} - {group || "Aucun groupe spécifié"} - {startDate.getHours()}h{startDate.getMinutes()} - {endDate.getHours()}h{endDate.getMinutes()}
                                        </p>
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