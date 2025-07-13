"use client";
/* This example requires Tailwind CSS v2.0+ */
import { useEffect, useState, useRef, useMemo } from 'react'
import { RightOutlined, LeftOutlined, ReloadOutlined } from '@ant-design/icons';
import { Button } from './ui/Button';
import { CalendarEvent } from '@/components/ui/CalendarEvent';
import { CurrentTimeLine } from '@/components/ui/CurrentTimeLine';
import { getWeekData } from '@/actions/GetWeekData';
import GetCalendar from '@/actions/GetCalendar';
import { CalendarEventProps } from '@/lib/types';
import { set } from 'date-fns';
import { CalculateOverlaps } from '@/lib/helper';
import DayColumn from './ui/DayColumn';

export default function Agenda() {

    const [calendarEvents, setCalendarEvents] = useState<CalendarEventProps[] | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [weekOffset, setWeekOffset] = useState<number>(0);
    const [swipeOffset, setSwipeOffset] = useState<number>(0);
    const [mapping, setMapping] = useState<Record<string, { position: number, columns: number }>>({});
    
    const agendaRef = useRef<HTMLDivElement>(null);
    const touchStartX = useRef<number | null>(null);

    const { weekDates, currentDayIndex } = getWeekData(weekOffset);

    const fetchCalendarEvents = async () => {
        setLoading(true);
        const calendarData = await GetCalendar();
        if (calendarData) {
            const { sorted, mapping } = CalculateOverlaps(calendarData);
            setCalendarEvents(sorted);
            setMapping(mapping);
            console.log("Calendar events fetched and overlaps calculated.");
        } else {
            console.error("Failed to fetch calendar events");
        }

        

        setLoading(false);
    }

    useEffect(() => {
        fetchCalendarEvents();

        if (typeof window !== 'undefined' && agendaRef.current) {
            const isMobile = window.innerWidth < 640; // Check if the screen width is less than 640px
            if (isMobile) {
                const rect = agendaRef.current.getBoundingClientRect();
                const oneThirdScreenHeight = window.innerHeight / 3;
                agendaRef.current.scrollIntoView({ behavior: 'smooth' });
            }
        }
    }, [weekOffset])

    const shortLabels = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven'];

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
        setSwipeOffset(0);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if(touchStartX.current === null) return;
        const deltaX = e.touches[0].clientX - touchStartX.current;
        setSwipeOffset(deltaX)
    }

    const handleTouchEnd = (e: React.TouchEvent) => {
        if(touchStartX.current === null) return;
        const deltaX = e.changedTouches[0].clientX - touchStartX.current;
        setLoading(true);
        if( Math.abs(deltaX) > 50) {
            if(deltaX > 0) {
                setWeekOffset(prev => prev - 1);
            } else {
                setWeekOffset(prev => prev + 1);
            }
        }
        setSwipeOffset(0);
        setLoading(false);
        touchStartX.current = null;
    };


    return (
        <div className="flex h-full flex-col">
        <header className="relative z-40 sm:flex flex-none items-center hidden justify-between py-4 px-6">
            <h1 className="text-xl font-semibold text-primary">
            <time dateTime="">Calendrier</time>
            </h1>
            <div className="flex items-center">
                <div className="text-sm sm:flex justify-center items-center hidden">
                <Button
                    status="secondary"
                    className='mr-2'
                    onClick={() => setWeekOffset(weekOffset - 1)}
                    disabled={loading}
                    ><LeftOutlined className='font-semibold'/>
                </Button>
                <Button
                    status="secondary"
                    onClick={() => setWeekOffset(0)}
                    disabled={loading || weekOffset === 0}
                    >Aujourd'hui</Button>
                <Button
                    status="secondary"
                    className='ml-2'
                    onClick={() => setWeekOffset(weekOffset + 1)}
                    disabled={loading}
                    ><RightOutlined />
                </Button>
                </div>         
            <div className="ml-4 flex items-center">
                <div className="ml-6 h-6 w-px bg-gray-300" />
                <Button onClick={() => fetchCalendarEvents()}
                >
                <ReloadOutlined />
                </Button>
            </div>
            
            </div>
        </header>
        <div className="flex flex-auto flex-col overflow-y-auto bg-white relative">
            <div ref={agendaRef} style={{transform: `translateX(${swipeOffset}px)`, transition: swipeOffset === 0 ? 'transform 0.2s ease-out' : 'none'}} className="flex max-w-full flex-none flex-col touch-pan-x w-screen sm:w-[165%]" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} onTouchMove={handleTouchMove}>
            <div
                className="sticky top-0 z-30 flex-none bg-white shadow ring-opacity-5"
            >
                <div className="grid grid-cols-5 text-sm text-primary sm:hidden">
                    {weekDates.map((date, i) => (
                        <button key={i} type="button" className="flex flex-col items-center pt-1 pb-2">{shortLabels[i]} {' '}
                            <span className={`mt-1 flex h-8 w-8 items-center text-primary justify-center font-semibold ${i === currentDayIndex ? 'rounded-full bg-primary-container text-white' : "text-gray-900" }`}>{date.getDate()}</span>
                        </button>
                    ))}
                </div>

                <div className="-mr-px hidden grid-cols-5 divide-x divide-gray-100 border-r border-gray-100 text-sm leading-6 text-gray-500 sm:grid">
                <div className="col-end-1 w-14" />
                {weekDates.map((date, i) => (
                    <div key={i} className="flex items-center justify-center py-3">
                        <span className="flex items-baseline text-primary">
                            {shortLabels[i]} <span className={`flex text-primary items-center justify-center font-semibold ml-1.5 ${i === currentDayIndex ? 'rounded-full  h-8 w-8 bg-primary-container text-white' : "text-gray-900" }`}>{" "} {date.getDate()}</span>
                        </span>
                    </div>
                ))}
                
                </div>
            </div>
            <div className="flex flex-auto">
                <div className="sticky left-0 z-10 w-14 flex-none bg-white ring-1 ring-gray-100" />
                <div className="grid flex-auto grid-cols-1 grid-rows-1">
                {/* Horizontal lines */}
                <div
                    className="col-start-1 col-end-2 row-start-1 grid divide-y divide-gray-100"
                    style={{ gridTemplateRows: 'repeat(24, minmax(2rem, 1fr))' }}
                >
                    <div>
                    <div className="sticky left-0 z-20 -mt-2.5 -ml-14 w-14 pr-2 text-right text-xs leading-5 text-gray-400">
                    </div>
                    </div>
                    <div />
                    <div>
                    <div className="sticky left-0 z-20 -mt-2.5 -ml-14 w-14 pr-2 text-right text-xs leading-5 text-gray-400">
                        8:00
                    </div>
                    </div>
                    <div />
                    <div>
                    <div className="sticky left-0 z-20 -mt-2.5 -ml-14 w-14 pr-2 text-right text-xs leading-5 text-gray-400">
                        9:00
                    </div>
                    </div>
                    <div />
                    <div>
                    <div className="sticky left-0 z-20 -mt-2.5 -ml-14 w-14 pr-2 text-right text-xs leading-5 text-gray-400">
                        10:00
                    </div>
                    </div>
                    <div />
                    <div>
                    <div className="sticky left-0 z-20 -mt-2.5 -ml-14 w-14 pr-2 text-right text-xs leading-5 text-gray-400">
                        11:00
                    </div>
                    </div>
                    <div />
                    <div>
                    <div className="sticky left-0 z-20 -mt-2.5 -ml-14 w-14 pr-2 text-right text-xs leading-5 text-gray-400">
                        12:00
                    </div>
                    </div>
                    <div />
                    <div>
                    <div className="sticky left-0 z-20 -mt-2.5 -ml-14 w-14 pr-2 text-right text-xs leading-5 text-gray-400">
                        13:00
                    </div>
                    </div>
                    <div />
                    <div>
                    <div className="sticky left-0 z-20 -mt-2.5 -ml-14 w-14 pr-2 text-right text-xs leading-5 text-gray-400">
                        14:00
                    </div>
                    </div>
                    <div />
                    <div>
                    <div className="sticky left-0 z-20 -mt-2.5 -ml-14 w-14 pr-2 text-right text-xs leading-5 text-gray-400">
                        15:00
                    </div>
                    </div>
                    <div />
                    <div>
                    <div className="sticky left-0 z-20 -mt-2.5 -ml-14 w-14 pr-2 text-right text-xs leading-5 text-gray-400">
                        16:00
                    </div>
                    </div>
                    <div />
                    <div>
                    <div className="sticky left-0 z-20 -mt-2.5 -ml-14 w-14 pr-2 text-right text-xs leading-5 text-gray-400">
                        17:00
                    </div>
                    </div>
                    <div />
                    <div>
                    <div className="sticky left-0 z-20 -mt-2.5 -ml-14 w-14 pr-2 text-right text-xs leading-5 text-gray-400">
                        18:00
                    </div>
                    </div>
                    <div />
                </div>

                {/* Vertical lines */}
                <div className="col-start-1 col-end-2 row-start-1 grid-rows-1 divide-x divide-gray-100 grid grid-cols-5">
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
                <ol className="col-start-1 col-end-2 row-start-1 grid grid-cols-5" style={{ gridTemplateRows: 'repeat(144, minmax(0, 1fr)) auto' }}>
                    <CurrentTimeLine currentDay={currentDayIndex} />
                    {calendarEvents && calendarEvents.map((event, i) => {

                        const key = event.title + i;
                        const info = mapping[key] || { position: 0, columns: 1 };
                        const zIndex = key;

                        return (
                            <CalendarEvent
                                key={i}
                                title={event.title}
                                startDate={event.startDate}
                                endDate={event.endDate}
                                type={event.type}
                                weekOffset={weekOffset}
                                info={info}
                            />
                        )
                    })}
                </ol>
                </div>
            </div>
            </div>
        </div>
    </div>
    )
}
