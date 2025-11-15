"use client";

import { useState, useEffect } from "react";
import Agenda from "./Agenda";
import { GradeTable } from "./GradeTable";
import AbsencesStats from "./AbsencesStats";
import { Button } from "./ui/Button";
import { LoginForm } from "./LoginForm";
import { LogoutOutlined, SettingOutlined } from "@ant-design/icons";
import SettingsDialog from "./ui/SettingsDialog";
import { logOut } from "@/actions/Auth";
import { AbsencesTable } from "./AbsencesTable";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

type View = 'agenda' | 'grades' | 'absences';

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

    const [loginModalOpen, setLoginModalOpen] = useState(false);
    const [loginRequestedView, setLoginRequestedView] = useState<View | null>(null);

    const [gambling, setIsGambling] = useState(false);
  
    const [error, setError] = useState<string | null>(null);

    const queryClient = useQueryClient();
    const router = useRouter();

    useEffect(() => {
        if(!session?.username && (selectedView === 'grades' || selectedView === 'absences')){
            setSelectedView('agenda');
        }
    }, [session, selectedView])

    const logoutMutation = useMutation({
        mutationFn: logOut,
        onSuccess: () => {
            queryClient.clear();
            handleViewChange("agenda");
            router.refresh()
        }
    })

    const handleLogout = () => {
        logoutMutation.mutate();
    };
    

    function handleViewChange(view: View) {
        if (view === 'agenda') {
            setSelectedView('agenda');
            return;
        }
        
        if (session?.username) {
            setSelectedView(view);
        } else {
            setLoginRequestedView(view);
            setLoginModalOpen(true);
        }
    }


    return (
        <>
            {/* Parent container: stack on mobile, side-by-side on md+ */}
            <div className="w-full flex flex-col md:flex-row gap-4 h-full">
                <div className="w-full md:w-1/4 lg:w-1/5 flex flex-row md:flex-col p-2 md:p-4 bg-backgroundPrimary rounded-lg shadow-lg md:h-full">
                    <div className="hidden md:flex justify-between pb-4">
                        <h2 className="hidden xl:flex text-lg align-center font-semibold text-textPrimary mb-4 px-2">
                            Navigation
                        </h2>
                        <div className="flex gap-2">
                            <Button onClick={() => setSettingsModal(true)}>
                                <SettingOutlined />
                            </Button>
                            <Button onClick={handleLogout} disabled={session?.username == null || logoutMutation.isPending}>
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
                            onClick={() => handleViewChange('absences')}
                            className={`${commonButtonClass} ${selectedView === 'absences' ? activeButtonClass : inactiveButtonClass}`}
                            
                        >Mes Absences
                        </button>
                    </nav>
                    <div className="md:hidden flex flex-col px-2 gap-2">
                        <Button onClick={() => setSettingsModal(true)}>
                            <SettingOutlined />
                        </Button>
                        <Button onClick={handleLogout} disabled={session?.username == null}>
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
                                    queryClient.invalidateQueries({ queryKey: ["calendar"]});
                                    setIsGambling(localStorage.getItem("gambling") === "true");
                                }} />
                            )}

                {/* Login modal for protected views */}
                {loginModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/40">
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
                                queryClient.invalidateQueries();
                                if (loginRequestedView) {
                                    setSelectedView(loginRequestedView);
                                }
                                router.refresh();
                            }} />
                        </div>
                    </div>
                )}
                    {selectedView === 'agenda' && (
                        <Agenda onSettingsClick={() => setSettingsModal(true)}/>
                    )}

                    {selectedView === 'grades' && (
                        <>
                            <h2 className="text-xl font-semibold text-textPrimary mb-4">
                                Mes Notes
                            </h2>
                            <GradeTable session={session} gambling={gambling} />
                        </>
                    )}
                    {selectedView === 'absences' && (
                        <>
                            <AbsencesStats session={session} />
                            <AbsencesTable session={session} />
                        </>
                    )
                    }
                </div>
            </div>
        </>
    )
}