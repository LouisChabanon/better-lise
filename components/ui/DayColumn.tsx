"use client";

import { useState, useMemo } from "react";
import { CalendarEventProps } from "@/lib/types";
import { CalendarEvent } from "./CalendarEvent";
import { CurrentTimeLine } from "./CurrentTimeLine";

function CalculateOverlaps(events: CalendarEventProps[]){
    const sorted =  [...events].sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
    const groups: number[][] = [];

    sorted.forEach((event, index) => {
        let placed = false;
        for (const group of groups) {
            const lastIdx = group[group.length - 1];
            if (event.startDate < sorted[lastIdx].endDate) {
                group.push(index);
                placed = true;
                break;
            }
        }
        if (!placed) {
            groups.push([index]);
        }
    });

    const mapping: Record<string, { position: number, columns: number }> = {};
    groups.forEach((group => {
        const cols = group.length;
        group.forEach((idx, pos) => {
            const id = sorted[idx].title + idx;
            mapping[id] = { position: pos, columns: cols};
        });
    }));

    return { sorted, mapping };
}

interface DayColumnProps {
    events: CalendarEventProps[];
    dayIndex: number;
    weekOffset: number;
}

export default function DayColumn({ events, dayIndex, weekOffset }: DayColumnProps) {
    
    const eventsOfDay = useMemo(() => events.filter(event => {
        const day = event.startDate.getDay() === 0 ? 7 : event.startDate.getDay();
        return day === dayIndex;
        }), [events, dayIndex]
    );

    const [activeKey, setActiveKey] = useState<string | null>(null);

    const { sorted, mapping } = useMemo(() => CalculateOverlaps(eventsOfDay), [eventsOfDay]);

    console.log("We have ", eventsOfDay.length, "events for day index", dayIndex, "with week offset", weekOffset);

    // Events grid is 144 rows: 12h * 60min / 5min
    return (
            <div className="relative flex-1">
                <ol className="relative grid grid-cols-1" style={{ gridTemplateRows: "repeat(144, minmax(0, 1fr))" }}>
                    <CurrentTimeLine currentDay={dayIndex} />

                    {sorted.map((event, index) => {
                        const key = event.title + index;
                        const info = mapping[key] || { position: 0, columns: 1 };
                        const width = `${100 / info.columns}%`;
                        const left = `${(info.position * 100) / info.columns}%`;
                        const startMins = (event.startDate.getHours() - 7) * 60 + event.startDate.getMinutes();
                        const span = Math.max(1, Math.ceil(( (event.endDate.getTime() - event.startDate.getTime()) / 60000 ) / 5));
                        const startRow = Math.floor(startMins / 5) + 1;
                        const zIndex = key === activeKey ? 10 : 1;
                        return (
                            <li key={key} className="absolute" style={{
                                gridRow: `${startRow} / span ${span}`,
                                width: width,
                                left: left,
                                zIndex: zIndex
                            }}
                                onMouseEnter={() => setActiveKey(key)}
                                onMouseLeave={() => setActiveKey(null)}>
                                <a
                                    href="#"
                                    onClick={() => setActiveKey(key)}
                                    className="group flex flex-col overflow-y-auto rounded-lg p-2 text-xs leading-5 absolute inset-1">
                                </a>
                            </li>
                        )
                    })}
            </ol>
        </div>
    )

}