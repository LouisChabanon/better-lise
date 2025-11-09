"use client";

import { useEffect, useState, useRef } from 'react'
import { RightOutlined, LeftOutlined, HomeOutlined, ReloadOutlined } from '@ant-design/icons';
import { Button } from './ui/Button';
import { CalendarEvent } from '@/components/ui/CalendarEvent';
import { CurrentTimeLine } from '@/components/ui/CurrentTimeLine';
import { getWeekData } from '@/actions/GetWeekData';
import { CalendarEventProps } from '@/lib/types';
import { getMonthName } from '@/lib/helper';
import LoadingPlaceholder from '@/components/ui/LoadingPlaceholder';
import { tbk } from '@/lib/types';
import { AnimatePresence, motion, PanInfo, Variants } from "framer-motion";

interface AgendaProps {
    calendarEvents: CalendarEventProps[] | null;
    mapping: Record<string, {position: number, columns: number }>;
    isLoading: boolean;
    tbk: tbk;
    onReload?: () => void;
}

const variants: Variants = {
    enter: (direction: number) => ({
        x: direction > 0 ? '100%' : '-100%', // Enter from right if direction is positive (next week), else from left
        opacity: 0,
    }),
    center: {
        x: '0%',
        opacity: 1,
        transition: {
            x: { type: "tween", duration: 0.3, ease: "easeOut" },
            opacity: { duration: 0.2 }
        }
    },
    exit: (direction: number) => ({
        x: direction < 0 ? '100%' : '-100%', // Exit to right if direction is negative (prev week), else to left
        opacity: 0,
        transition: {
            x: { type: "tween", duration: 0.3, ease: "easeOut" },
            opacity: { duration: 0.2 }
        },
    })
};

export default function Agenda({ calendarEvents, mapping, isLoading, tbk, onReload}: AgendaProps) {

    const [weekOffset, setWeekOffset] = useState<number>(0);

    const [swipeDirection, setSwipeDirection] = useState<number>(0);

    const agendaRef = useRef<HTMLDivElement>(null);

    const { weekDates, currentDayIndex } = getWeekData(weekOffset);


    useEffect(() => {

        // If currentDayIndex is a weekend (Saturday or Sunday), display the next week
        if (currentDayIndex === null || currentDayIndex >= 5 || currentDayIndex < 0) {
            setWeekOffset(1); // Reset to next week if it's a weekend
        }
        
    }, [])

    const shortLabels = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven'];

    const handleDragEnd = (
        event: MouseEvent | TouchEvent | PointerEvent,
        info: PanInfo
    ) => {
        const swipeThreshold = 50;
        const offset = info.offset.x;

        if(Math.abs(offset) > swipeThreshold){
            if(offset>0){
                setSwipeDirection(-1);
                setWeekOffset(prev => prev - 1);
            } else {
                setSwipeDirection(1);
                setWeekOffset(prev => prev + 1);
            }
        }
    }

    const handleWeekChange = (directon: -1 | 1) => {
        setSwipeDirection(directon);
        setWeekOffset(prev => prev + directon);
    }


    return (
    
    <div className="flex h-full flex-col select-none">
        {/* Desktop Header */}
            <header className="relative z-40 sm:flex flex-none items-center hidden justify-between py-4 px-6">
                <h1 className="text-xl font-semibold text-textPrimary">
                <time dateTime="">{getMonthName(weekDates[0].getMonth())} {weekDates[0].getFullYear()}</time>
                </h1>
                <div className="flex items-center">
                    <div className="text-sm sm:flex justify-center items-center hidden">
                    <Button
                        status="secondary"
                        className='mr-2'
                        onClick={() => handleWeekChange(-1)}
                        disabled={isLoading}
                        ><LeftOutlined className='font-semibold'/>
                    </Button>
                    <Button
                        status="secondary"
                        onClick={() => {setWeekOffset(0); setSwipeDirection(0);}}
                        disabled={isLoading || weekOffset === 0 }
                        >Aujourd'hui</Button>
                    <Button
                        status="secondary"
                        className='ml-2 mr-2'
                        onClick={() => handleWeekChange(1)}
                        disabled={isLoading}
                        ><RightOutlined />
                    </Button>
                    {onReload && (
                        <Button status="primary" onClick={onReload} disabled={isLoading}><ReloadOutlined /></Button>
                    )}
                    </div>         
                </div>
            </header>
            {/* Mobile Header */}
            <header className="flex sm:hidden flex-none items-center justify-between py-2 px-6">
                <h1 className="text-xl font-semibold text-textPrimary">
                <time dateTime="">{getMonthName(weekDates[0].getMonth())} {weekDates[0].getFullYear()}</time>
                </h1>
                <div className="flex items-center gap-2">
                    <Button
                        status="secondary"
                        onClick={() => {setWeekOffset(0); setSwipeDirection(0);}}
                        disabled={isLoading || weekOffset === 0}
                        >
                            <HomeOutlined />
                    </Button>
                    {onReload && (
                        <Button status="primary" onClick={onReload} disabled={isLoading}><ReloadOutlined /></Button>
                    )}
                </div>
            </header>
    <div className="flex-1 min-h-0 flex flex-col overflow-auto md:overflow-hidden bg-backgroundPrimary relative">
            {isLoading ? (
                <LoadingPlaceholder />
            ) : (
            <div ref={agendaRef} className="flex-1 min-h-0 flex flex-col md:overflow-hidden">
            <div
                className="sticky top-0 z-30 flex-none bg-backgroundPrimary shadow ring-opacity-5"
            >
                <div className="grid grid-cols-5 text-sm text-textPrimary sm:hidden">
                <div className="col-end-1 w-14" />
                    {weekDates.map((date, i) => (
                        <button key={i} type="button" className="flex flex-col items-center pt-1 pb-1">{shortLabels[i]} {' '}
                            <span className={`mt-1 flex h-8 w-8 items-center text-textPrimary justify-center font-semibold ${i === currentDayIndex ? 'rounded-full bg-primary-container text-white' : "text-gray-900" }`}>{date.getDate()}</span>
                        </button>
                    ))}
                </div>

                <div className="-mr-px hidden grid-cols-5 divide-x divide-calendarGridBorder border-r border-calendarGridBorder text-sm leading-6 text-gray-500 sm:grid">
                <div className="col-end-1 w-14" />
                {weekDates.map((date, i) => (
                    <div key={i} className="flex items-center justify-center py-3">
                        <span className="flex items-baseline text-textPrimary">
                            {shortLabels[i]} <span className={`flex text-textPrimary items-center justify-center font-semibold ml-1.5 ${i === currentDayIndex ? 'rounded-full  h-8 w-8 bg-primary-container text-white' : "text-gray-900" }`}>{" "} {date.getDate()}</span>
                        </span>
                    </div>
                ))}
                
                </div>
            </div>
            <div className="flex-1 min-h-0 flex ">
                <div className="sticky left-0 z-10 w-14 bg-backgroundPrimary ring-1 ring-calendarGridBorder" />
                <div className="grid flex-1 min-h-0 grid-cols-1 grid-rows-1 h-full">
                {/* Horizontal lines */}
                <div
                    className="col-start-1 col-end-2 row-start-1 grid divide-y divide-calendarGridBorder"
                    style={{ gridTemplateRows: 'repeat(24, minmax(2rem, 1fr))' }}
                >
                    <div>
                    <div className="sticky left-0 z-20 -mt-2.5 -ml-14 w-14 pr-2 text-right text-xs leading-5 text-textQuaternary">
                    </div>
                    </div>
                    <div />
                    <div>
                    <div className="sticky left-0 z-20 -mt-2.5 -ml-14 w-14 pr-2 text-right text-xs leading-5 text-textQuaternary">
                        8:00
                    </div>
                    </div>
                    <div />
                    <div>
                    <div className="sticky left-0 z-20 -mt-2.5 -ml-14 w-14 pr-2 text-right text-xs leading-5 text-textQuaternary">
                        9:00
                    </div>
                    </div>
                    <div />
                    <div>
                    <div className="sticky left-0 z-20 -mt-2.5 -ml-14 w-14 pr-2 text-right text-xs leading-5 text-textQuaternary">
                        10:00
                    </div>
                    </div>
                    <div />
                    <div>
                    <div className="sticky left-0 z-20 -mt-2.5 -ml-14 w-14 pr-2 text-right text-xs leading-5 text-textQuaternary">
                        11:00
                    </div>
                    </div>
                    <div />
                    <div>
                    <div className="sticky left-0 z-20 -mt-2.5 -ml-14 w-14 pr-2 text-right text-xs leading-5 text-textQuaternary">
                        12:00
                    </div>
                    </div>
                    <div />
                    <div>
                    <div className="sticky left-0 z-20 -mt-2.5 -ml-14 w-14 pr-2 text-right text-xs leading-5 text-textQuaternary">
                        13:00
                    </div>
                    </div>
                    <div />
                    <div>
                    <div className="sticky left-0 z-20 -mt-2.5 -ml-14 w-14 pr-2 text-right text-xs leading-5 text-textQuaternary">
                        14:00
                    </div>
                    </div>
                    <div />
                    <div>
                    <div className="sticky left-0 z-20 -mt-2.5 -ml-14 w-14 pr-2 text-right text-xs leading-5 text-textQuaternary">
                        15:00
                    </div>
                    </div>
                    <div />
                    <div>
                    <div className="sticky left-0 z-20 -mt-2.5 -ml-14 w-14 pr-2 text-right text-xs leading-5 text-textQuaternary">
                        16:00
                    </div>
                    </div>
                    <div />
                    <div>
                    <div className="sticky left-0 z-20 -mt-2.5 -ml-14 w-14 pr-2 text-right text-xs leading-5 text-textQuaternary">
                        17:00
                    </div>
                    </div>
                    <div />
                    <div>
                    <div className="sticky left-0 z-20 -mt-2.5 -ml-14 w-14 pr-2 text-right text-xs leading-5 text-textQuaternary">
                        18:00
                    </div>
                    </div>
                    <div />
                </div>

                {/* Vertical lines */}
                <div className="col-start-1 col-end-2 row-start-1 grid-rows-1 divide-x divide-calendarGridBorder grid grid-cols-5 h-full">
                    <div className="col-start-1 row-span-full" />
                    <div className="col-start-2 row-span-full" />
                    <div className="col-start-3 row-span-full" />
                    <div className="col-start-4 row-span-full" />
                    <div className="col-start-5 row-span-full" />
                    <div className="col-start-6 row-span-full" />
                    <div className="col-start-7 row-span-full" />
                    <div className="col-start-8 row-span-full" />
                </div>

                {/* Events grid is 144 rows: 12h * 60min / 5min */}
                <AnimatePresence initial={false} custom={swipeDirection}>
                    <motion.ol
                        key={weekOffset}
                        className="col-start-1 col-end-2 row-start-1 grid grid-cols-5 bg-gradient-to-r from-primary-container/5 via-transparent to-primary/5 sm:bg-none h-full md:overflow-auto"
                        style={{ 
                            gridTemplateRows: 'repeat(144, minmax(0, 1fr)) auto',
                        }}
                        variants={variants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        custom={swipeDirection}
                        dragConstraints={{ left: 0, right: 0 }}
                        drag="x"
                        onDragEnd={handleDragEnd}
                        >

                        {weekOffset == 0 && (
                            <CurrentTimeLine currentDay={currentDayIndex} />
                        )}
                        {calendarEvents && calendarEvents.map((event, i) => {

                            const key = event.title + i;
                            const info = mapping[key] || { position: 0, columns: 1 };
                            const zIndex = key;

                            return (
                                <CalendarEvent
                                    key={i}
                                    title={event.title}
                                    summary={event.summary}
                                    room={event.room}
                                    teacher={event.teacher}
                                    group={event.group}
                                    startDate={event.startDate}
                                    endDate={event.endDate}
                                    type={event.type}
                                    weekOffset={weekOffset}
                                    info={info}
                                    tbk={tbk}
                                    isAllDay={event.isAllDay}
                                />
                            )
                        })}
                    </motion.ol>
                </AnimatePresence>
                </div>
            </div>
            </div> 
        )}
        </div>
    </div>
    
    )
}
