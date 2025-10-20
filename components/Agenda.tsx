"use client";

import { useEffect, useState, useRef } from 'react'
import { RightOutlined, LeftOutlined, ReloadOutlined, HomeOutlined, SettingOutlined } from '@ant-design/icons';
import { Button } from './ui/Button';
import { CalendarEvent } from '@/components/ui/CalendarEvent';
import { CurrentTimeLine } from '@/components/ui/CurrentTimeLine';
import { getWeekData } from '@/actions/GetWeekData';
import getCrousData from '@/actions/GetCrousData';
import GetCalendar from '@/actions/GetCalendar';
import { CalendarEventProps } from '@/lib/types';
import { CalculateOverlaps, getMonthName, liseIdChecker } from '@/lib/helper';
import LoadingPlaceholder from './ui/loaddingPlaceholder';
import SettingsDialog from './ui/SettingsDialog';
import { tbk } from '@/lib/types';
export default function Agenda() {

    const [calendarEvents, setCalendarEvents] = useState<CalendarEventProps[] | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [usernameModal, setUsernameModal] = useState<boolean>(false);
    const [settingsModal, setSettingsModal] = useState<boolean>(false);
    const [tbk, setTbk] = useState<tbk>("Sibers");
    const [weekOffset, setWeekOffset] = useState<number>(0);
    const [swipeOffset, setSwipeOffset] = useState<number>(0);
    const [mapping, setMapping] = useState<Record<string, { position: number, columns: number }>>({});

    
    const agendaRef = useRef<HTMLDivElement>(null);
    const touchStartX = useRef<number | null>(null);
    const touchStartY = useRef<number | null>(null);
    const isSwiping = useRef<boolean>(false);
    const animationFrameRef = useRef<number | null>(null);

    const { weekDates, currentDayIndex } = getWeekData(weekOffset);

    const fetchCalendarEvents = async () => {
        setLoading(true);
        const savedUsername = localStorage.getItem("lise_id");
        const savedTbk = (localStorage.getItem("tbk") || "Sibers") as tbk;
        setTbk(savedTbk);

        if (!savedUsername) {
            setSettingsModal(true);
            setLoading(false);
            return;
        }

        if(!savedTbk){
            setSettingsModal(true);
            setLoading(false);
            return;
        }
        
        
        const calendarDataRes = await GetCalendar(savedUsername);
        const crousData = await getCrousData(savedTbk);

        if (calendarDataRes.status === "success") {

            const eventData = calendarDataRes.events.concat(crousData || []);

            const { sorted, mapping } = CalculateOverlaps(eventData);
            setCalendarEvents(sorted);
            setMapping(mapping);
            //console.log("Calendar events fetched and overlaps calculated.");
        } else if (calendarDataRes.status === "no user") {
            setCalendarEvents([]);
            setUsernameModal(true);
            console.warn("No user session found. Please log in to view your calendar.");
        } else {
            setCalendarEvents([]);
            console.error("Failed to fetch calendar events");
        }
        
        setLoading(false);
    }

    useEffect(() => {
        
        fetchCalendarEvents();

        // If currentDayIndex is a weekend (Saturday or Sunday), display the next week
        if (currentDayIndex === null || currentDayIndex >= 5 || currentDayIndex < 0) {
            setWeekOffset(1); // Reset to next week if it's a weekend
        }
    }, [])

    const shortLabels = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven'];

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
        touchStartY.current = e.touches[0].clientY;
        setSwipeOffset(0);
        isSwiping.current = false;
    };

    const handleTouchMove = (e: React.TouchEvent) => {

        if(touchStartX.current === null || touchStartY.current === null) return;
        
        const deltaX = e.touches[0].clientX - touchStartX.current;
        const deltaY = e.touches[0].clientY - touchStartY.current;

        if (Math.abs(deltaY) > Math.abs(deltaX)) {
            // User is scrolling vertically, ignore horizontal swipe
            return;
        }

        if(Math.abs(deltaX) < 10) return; // Ignore small movements

        isSwiping.current = true;

        e.preventDefault();

        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }

        animationFrameRef.current = requestAnimationFrame(() => {
            setSwipeOffset(deltaX);
        });
    }

    const handleTouchEnd = (e: React.TouchEvent) => {
        if(!isSwiping.current || touchStartX.current === null){
            touchStartX.current = null;
            touchStartY.current = null;
            return;
        }
        
        const deltaX = e.changedTouches[0].clientX - touchStartX.current;
        

        if( Math.abs(deltaX) > 50) {
            if(deltaX > 0) {
                setWeekOffset(prev => prev - 1);
            } else {
                setWeekOffset(prev => prev + 1);
            }
        }

        setTimeout(() => {
            setSwipeOffset(0);
        }, 100);
        
        touchStartX.current = null;
        touchStartY.current = null;
        isSwiping.current = false;
    };


    return (
        
        <div className="flex h-full flex-col select-none">
            <header className="relative z-40 sm:flex flex-none items-center hidden justify-between py-4 px-6">
                <h1 className="text-xl font-semibold text-textPrimary">
                <time dateTime="">{getMonthName(weekDates[0].getMonth())} {weekDates[0].getFullYear()}</time>
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
                <div className="ml-4 flex items-center gap-2">
                    <Button onClick={() => fetchCalendarEvents()}
                    >
                        <ReloadOutlined />
                    </Button>
                    <Button onClick={() => setSettingsModal(true)}>
                        <SettingOutlined />
                    </Button>
                </div>
                
                </div>
            </header>
            <header className="flex sm:hidden flex-none items-center justify-between py-2 px-6">
                <h1 className="text-xl font-semibold text-textPrimary">
                <time dateTime="">{getMonthName(weekDates[0].getMonth())} {weekDates[0].getFullYear()}</time>
                </h1>
                <div className="flex items-center gap-2">
                    <Button
                        status="secondary"
                        onClick={() => setWeekOffset(0)}
                        disabled={loading || weekOffset === 0}
                        >
                            <HomeOutlined />
                    </Button>
                    <Button onClick={() => fetchCalendarEvents()}
                    >
                        <ReloadOutlined />
                    </Button>
                    <Button onClick={() => setSettingsModal(true)}>
                        <SettingOutlined />
                    </Button>
                </div>
            </header>
        <div className="flex flex-auto flex-col overflow-y-auto bg-backgroundPrimary relative">
            {settingsModal && (
                <SettingsDialog isOpen={settingsModal} onClose={() => {
                    setSettingsModal(false);
                }} onSave={() => {
                    setSettingsModal(false);
                    fetchCalendarEvents();
                }} />
            )}
            {loading ? (
                <LoadingPlaceholder />
            ) : (
            <div ref={agendaRef} className="flex flex-none flex-col">
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
            <div className="flex flex-auto">
                <div className="sticky left-0 z-10 w-14 flex-none bg-backgroundPrimary ring-1 ring-calendarGridBorder" />
                <div className="grid flex-auto grid-cols-1 grid-rows-1">
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
                <div className="col-start-1 col-end-2 row-start-1 grid-rows-1 divide-x divide-calendarGridBorder grid grid-cols-5">
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
                <ol 
                    className="col-start-1 col-end-2 row-start-1 grid grid-cols-5
                    bg-gradient-to-r from-primary-container/5 via-transparent to-primary/5 sm:bg-none"
                    style={{ 
                        gridTemplateRows: 'repeat(144, minmax(0, 1fr)) auto',
                        transform: `translateX(${swipeOffset}px)`, 
                        transition: swipeOffset === 0 ? 'transform 0.2s ease-out' : 'none'
                      }}
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                    onTouchMove={handleTouchMove}
                    onTouchCancel={handleTouchEnd}
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
                                priority={event.priority}
                                tbk={tbk}
                            />
                        )
                    })}
                </ol>
                </div>
            </div>
            </div> 
        )}
        </div>
    </div>
    
    )
}
