"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "./ui/Button";
import { LogoutOutlined, SettingOutlined } from "@ant-design/icons";
import SettingsDialog from "./ui/SettingsDialog";
import { logOut } from "@/actions/Auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const commonButtonClass = "flex-1 p-3 rounded-lg md:text-left md:font-medium text-center font-semibold text-base md:w-full block no-underline";
const activeButtonClass = "bg-buttonPrimaryBackground text-buttonTextPrimary shadow-sm";
const inactiveButtonClass = "text-buttonTextSecondary hover:bg-buttonSecondaryHover"; 

export default function AppSidebar({ 
    children, 
    session 
}: { 
    children: React.ReactNode, 
    session: any 
}) {
    const pathname = usePathname();
    const router = useRouter();
    const queryClient = useQueryClient();
    const [settingsModal, setSettingsModal] = useState<boolean>(false);

    const logoutMutation = useMutation({
        mutationFn: logOut,
        onSuccess: () => {
            queryClient.clear();
            router.refresh();
            router.push("/"); // Redirect to home after logout
        }
    });

    const handleLogout = () => {
        logoutMutation.mutate();
    };

    // Helper to check active route
    const isActive = (path: string) => {
        if (path === "/" && pathname === "/") return true;
        if (path !== "/" && pathname.startsWith(path)) return true;
        return false;
    };

    return (
        <div className="w-full flex flex-col md:flex-row gap-4 h-full">
            {/* Sidebar / Navbar Container */}
            <div className="w-full md:w-1/4 lg:w-1/5 flex flex-row md:flex-col p-2 md:p-4 bg-backgroundPrimary rounded-lg shadow-lg md:h-full shrink-0">
                
                {/* Desktop Header (Logo/Actions) */}
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

                {/* Navigation Links */}
                <nav className="flex flex-row md:flex-col gap-2 w-full overflow-auto">
                    <Link
                        href="/"
                        className={`${commonButtonClass} ${isActive("/") ? activeButtonClass : inactiveButtonClass}`}
                    >
                        Agenda
                    </Link>
                    <Link
                        href="/grades"
                        className={`${commonButtonClass} ${isActive("/grades") ? activeButtonClass : inactiveButtonClass}`}
                    >
                        Mes Notes
                    </Link>
                    <Link
                        href="/absences"
                        className={`${commonButtonClass} ${isActive("/absences") ? activeButtonClass : inactiveButtonClass}`}
                    >
                        Mes Absences
                    </Link>
                </nav>

                {/* Mobile Settings/Logout Buttons (Visible only on small screens) */}
                <div className="md:hidden flex flex-col px-2 gap-2 justify-center">
                    <Button onClick={() => setSettingsModal(true)}>
                        <SettingOutlined />
                    </Button>
                    {/* Optional: Show logout on mobile only if logged in */}
                    {session?.username && (
                        <Button onClick={handleLogout}>
                            <LogoutOutlined />
                        </Button>
                    )}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="w-full md:w-3/4 lg:w-4/5 flex flex-col md:p-4 bg-backgroundPrimary rounded-lg md:h-full md:min-h-0 overflow-hidden relative">
                {children}
            </div>

            {/* Global Settings Modal */}
            {settingsModal && (
                <SettingsDialog 
                    isOpen={settingsModal} 
                    onClose={() => setSettingsModal(false)} 
                    onSave={() => {
                        setSettingsModal(false);
                        queryClient.invalidateQueries({ queryKey: ["calendar"]});
                        // Logic for gambling state update if needed
                        router.refresh();
                    }} 
                />
            )}
        </div>
    );
}