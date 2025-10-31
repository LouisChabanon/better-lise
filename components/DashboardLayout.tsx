"use client";

import { useEffect, useState } from "react";
import Agenda from "./Agenda";
import { GradeTable } from "./GradeTable";
import { GradeType, AbsenceType, CalendarEventProps, tbk } from "@/lib/types";
import { getGradeData } from "@/actions/GetGrades";
import { getAbsenceData } from "@/actions/GetAbsences";
import getCrousData from "@/actions/GetCrousData";
import GetCalendar from "@/actions/GetCalendar";
import { CalculateOverlaps } from "@/lib/helper";
import { Button } from "./ui/Button";
import { LoginForm } from "./LoginForm";
import { LogoutOutlined, SettingOutlined } from "@ant-design/icons";
import SettingsDialog from "./ui/SettingsDialog";
import { logOut } from "@/actions/Auth";

type View = 'agenda' | 'grades' | 'vacancies';

// Buttons should flex on small screens (horizontal bar) and be full width on md+ where nav is vertical
const commonButtonClass = "flex-1 p-3 rounded-lg md:text-left md:font-medium text-center font-semibold text-base md:w-full";
const activeButtonClass = "bg-buttonPrimaryBackground text-buttonTextPrimary shadow-sm";
const inactiveButtonClass = "text-buttonTextSecondary hover:bg-buttonSecondaryHover"; 

type SessionType = { isAuth: boolean; username?: string } | null | undefined;

type DashboardLayoutProps = {
    session?: SessionType;
};

export default function DashboardLayout({ session }: DashboardLayoutProps){

    const [selectedView, setSelectedView] = useState<View>('agenda');

    const [settingsModal, setSettingsModal] = useState<boolean>(false);
    const [tbk, setTbk] = useState<tbk>("Sibers");

    // Login modal handling when user requests a protected view
    const [loginModalOpen, setLoginModalOpen] = useState(false);
    const [loginRequestedView, setLoginRequestedView] = useState<View | null>(null);

    const [grades, setGrades] = useState<GradeType[] | null>(null);
    const [absence, setAbsence] = useState<AbsenceType[] | null>(null);
    const [calendarEvents, setCalendarEvents] = useState<CalendarEventProps[] | null>(null);

    const [isGradesLoading, setGradesLoading] = useState(true);
    const [isAbsencesLoading, setAbsencesLoading] = useState(true);
    const [isCalendarLoading, setCalendarLoading] = useState(true);

    const [error, setError] = useState<string | null>(null);

    const [eventMapping, setEventMapping] = useState<Record<string, { position: number, columns: number }>>({});

    async function fetchCalendarEvents(){
        setCalendarLoading(true)
        const savedUsername = localStorage.getItem("lise_id");
        const savedTbk = (localStorage.getItem("tbk") || "Sibers") as tbk;
        setTbk(savedTbk);

        if (!savedUsername) {
            setSettingsModal(true);
            setCalendarLoading(false);
            return;
        }

        if(!savedTbk){
            setSettingsModal(true);
            setCalendarLoading(false);
            return;
        }

        const calendarDataRes = await GetCalendar(savedUsername);
        const crousData = await getCrousData(savedTbk);

        if (calendarDataRes.status === "success") {
        
            const eventData = calendarDataRes.events.concat(crousData || []);
            const { sorted, mapping } = CalculateOverlaps(eventData);
        
            setCalendarEvents(sorted);
            setEventMapping(mapping);
            } else if (calendarDataRes.status === "no user") {
                setCalendarEvents([]);
                setSettingsModal(true);
                console.warn("No user session found. Please log in to view your calendar.");
            } else {
                setCalendarEvents([]);
                console.error("Failed to fetch calendar events");
        }
                
            setCalendarLoading(false);
    }
    

    async function fetchGrades(reachServer = false) {
          setGradesLoading(true)
          const res = await getGradeData(reachServer);
                    if (res.success && res.data) {

                    // Ensure we operate on grade-like items; the API should return GradeType[]
                        const gradeItems = (res.data as GradeType[]).filter((g: any) => typeof g?.date !== 'undefined');

                    // Sort grades by date in descending order
                        const sorted = gradeItems.sort((a: any, b: any) => {
                            const [dayA, monthA, yearA] = a.date.split('/').map(Number);
                            const [dayB, monthB, yearB] = b.date.split('/').map(Number);
                            const timeA = new Date(yearA, monthA - 1, dayA).getTime();
                            const timeB = new Date(yearB, monthB - 1, dayB).getTime();
                            return timeB - timeA;});

                    // Sort new grades to the top (use loose checks to avoid union-type issues)
                    const sortNew = sorted.sort((a: any, b: any) => {
                        const aIsNew = !!a?.isNew;
                        const bIsNew = !!b?.isNew;
                        if (aIsNew && !bIsNew) return -1;
                        if (!aIsNew && bIsNew) return 1;
                        return 0;
                    });
                        setGrades(sortNew as GradeType[]);
                    setGradesLoading(false);
                } else {
                    setGradesLoading(false);
                    console.error("Failed to fetch grades:", res.errors || "Unknown error");
                }
      }

        function handleViewChange(view: View) {
                // Agenda is always allowed
                if (view === 'agenda') {
                        setSelectedView('agenda');
                        return;
                }

                const hasUser = session?.username;
                //console.log("Changing page to ", view)
                if (hasUser) {
                        setSelectedView(view);
                        //if (view === 'grades') fetchGrades(true);
                        //if (view === 'vacancies') fetchAbsences(true);
                } else {
                        //console.log("No user found", hasUser)
                        setLoginRequestedView(view);
                        setLoginModalOpen(true);
                }
        }

    async function fetchAbsences(reachServer = false){
        setAbsencesLoading(true)
        const res = await getAbsenceData(reachServer)
        if(res.success && res.data){
            console.log(res.data)
        }
        setAbsencesLoading(false)
    }

    useEffect(() => {
        try {
            fetchCalendarEvents()
            // Only fetch grades/absences if we have a known username (session or localStorage)
            const hasUser = session?.username || localStorage.getItem("lise_id");
            if (hasUser) {
                fetchGrades(true);
                fetchAbsences(true);
            }
        }catch (err){
            setError(err instanceof Error ? err.message : "Une erreur inconnue s'est produite")
            setCalendarLoading(false);
            setAbsencesLoading(false);
            setGradesLoading(false);
        }
    }, [])


    return (
        <>
            {/* Parent container: stack on mobile, side-by-side on md+ */}
            <div className="w-full flex flex-col md:flex-row gap-4 h-full">
                <div className="w-full md:w-1/4 lg:w-1/5 flex flex-row md:flex-col p-2 md:p-4 bg-backgroundPrimary rounded-lg shadow-lg md:h-full">
                    <div className="hidden md:flex justify-between pb-4">
                        <h2 className="flex text-xl align-center font-semibold text-textPrimary mb-4 px-2">
                            Navigation
                        </h2>
                        <div className="flex gap-2">
                            <Button onClick={() => setSettingsModal(true)}>
                                <SettingOutlined />
                            </Button>
                            <Button onClick={() => logOut()} disabled={session?.username == null}>
                                <LogoutOutlined />
                            </Button>
                        </div>
                    </div>
                    {/* Nav: horizontal on small screens, vertical on md+ */}
                    <nav className="flex flex-row md:flex-col gap-2 w-full overflow-auto">
                        <button
                            onClick={() => handleViewChange('agenda')}
                            className={`${commonButtonClass} ${selectedView === 'agenda' ? activeButtonClass : inactiveButtonClass}`}
                        >Agenda
                        </button>
                        <button
                            onClick={() => handleViewChange('grades')}
                            className={`${commonButtonClass} ${selectedView === 'grades' ? activeButtonClass : inactiveButtonClass}`}
                        >Mes Notes
                        </button>
                        <button
                            onClick={() => alert("Feature not Available")}
                            className={`${commonButtonClass} ${selectedView === 'vacancies' ? activeButtonClass : inactiveButtonClass}`}
                            
                        >Mes Absences
                        </button>
                    </nav>
                    <div className="md:hidden flex flex-col px-2 gap-2">
                        <Button onClick={() => setSettingsModal(true)}>
                            <SettingOutlined />
                        </Button>
                        <Button onClick={() => logOut()} disabled={session?.username == null}>
                            <LogoutOutlined />
                        </Button>
                    </div>
                </div>
                <div className="w-full md:w-3/4 lg:w-4/5 flex flex-col md:p-4 bg-backgroundPrimary rounded-lg md:h-full md:min-h-0">
                {settingsModal && (
                                <SettingsDialog isOpen={settingsModal} onClose={() => {
                                    setSettingsModal(false);
                                }} onSave={() => {
                                    setSettingsModal(false);
                                    fetchCalendarEvents();
                                }} />
                            )}

                {/* Login modal for protected views */}
                {loginModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                        <div className="bg-backgroundPrimary p-6 rounded-lg max-w-md w-full">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex flex-col">
                                    <h2 className="text-lg text-textPrimary font-bold">Connexion</h2>
                                    <p className="font-medium text-textTertiary">Utiliser vos identifiants Lise</p>
                                </div>
                                <Button status="secondary" onClick={() => setLoginModalOpen(false)}>✕</Button>
                            </div>
                            
                            <LoginForm onSuccess={async () => {
                                setLoginModalOpen(false);
                                if (loginRequestedView) {
                                    setSelectedView(loginRequestedView);
                                    if (loginRequestedView === 'grades') await fetchGrades(true);
                                    if (loginRequestedView === 'vacancies') await fetchAbsences(true);
                                }
                            }} />
                        </div>
                    </div>
                )}
                    {selectedView === 'agenda' && (
                        <Agenda
                            calendarEvents={calendarEvents}
                            mapping={eventMapping}
                            isLoading={isCalendarLoading}
                        />
                    )}

                    {selectedView === 'grades' && (
                        <>
                            <h2 className="text-xl font-semibold text-textPrimary mb-4">
                                Mes Notes
                            </h2>
                            <GradeTable 
                                grades={grades}
                                isLoading={isGradesLoading}
                                error={error}
                            />
                        </>
                    )}
                </div>
            </div>
        </>
    )
}