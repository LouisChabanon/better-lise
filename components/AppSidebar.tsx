"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
    LogoutOutlined, 
    SettingOutlined, 
    CalendarOutlined, 
    ReadOutlined, 
    ClockCircleOutlined
} from "@ant-design/icons";
import SettingsDialog from "./ui/SettingsDialog";
import { logOut } from "@/actions/Auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import Image from "next/image";
import { revalidatePath } from "next/cache";

// Helper component for Desktop Navigation Items
const NavItem = ({ href, label, icon, isActive, onClick }: any) => (
    <Link
        href={href}
        onClick={onClick}
        className={`
            relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group
            md:flex-row flex-col md:justify-start justify-center
            ${isActive 
                ? "bg-primary-50 text-textPrimary font-semibold" 
                : "text-textSecondary hover:bg-backgroundSecondary hover:text-textPrimary"
            }
        `}
    >
        {isActive && (
            <motion.div
                layoutId="activeNavIndicator"
                className="absolute left-0 w-1 h-6 bg-primary rounded-r-full hidden md:block"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
            />
        )}
        <span className="text-xl mb-1 md:mb-0">{icon}</span>
        <span className="text-[10px] md:text-sm font-medium">{label}</span>
    </Link>
);

// Helper for Mobile Bottom Nav Items (Links)
const MobileNavLink = ({ href, label, icon, isActive }: any) => (
    <Link
        href={href}
        className={`flex flex-col items-center justify-center gap-1 p-2 w-full transition-colors ${
            isActive ? "text-primary font-semibold" : "text-textTertiary hover:text-textPrimary"
        }`}
    >
        <span className={`text-xl ${isActive ? "scale-110" : ""}`}>{icon}</span>
        <span className="text-[10px]">{label}</span>
    </Link>
);

// Helper for Mobile Bottom Nav Buttons (Actions)
const MobileNavButton = ({ onClick, label, icon, isDestructive = false }: any) => (
    <button
        onClick={onClick}
        className={`flex flex-col items-center justify-center gap-1 p-2 w-full transition-colors ${
            isDestructive ? "text-error/80 hover:text-error" : "text-textTertiary hover:text-textPrimary"
        }`}
    >
        <span className="text-xl">{icon}</span>
        <span className="text-[10px]">{label}</span>
    </button>
);

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
            router.push("/");
        }
    });

    const isActive = (path: string) => {
        if (path === "/" && pathname === "/") return true;
        if (path !== "/" && pathname.startsWith(path)) return true;
        return false;
    };

    return (
        <div className="flex flex-col md:flex-row h-full w-full bg-backgroundSecondary overflow-hidden">
            
            {/* ================= DESKTOP SIDEBAR ================= */}
            <aside className="hidden md:flex w-64 flex-col bg-backgroundPrimary border-r border-backgroundSecondary z-20 h-full shadow-sm rounded-lg">
                {/* Header / Logo Area */}
                <div className="p-6 flex items-center gap-3">
                    <div className="relative h-8 w-8 shadow-primary/30 rounded-lg overflow-hidden shrink-0">
                        <Image src="/apple-icon.png" alt="Logo" fill className="object-cover" priority />
                    </div>
                    <h1 className="text-xl font-bold text-textPrimary tracking-tight">Better Lise</h1>
                </div>

                {/* Navigation Links */}
                <nav className="flex-1 px-4 space-y-2 mt-4">
                    <p className="px-4 text-xs font-semibold text-textTertiary uppercase tracking-wider mb-2">Menu</p>
                    <NavItem 
                        href="/" 
                        label="Agenda" 
                        icon={<CalendarOutlined />} 
                        isActive={isActive("/")} 
                    />
                    <NavItem 
                        href="/grades" 
                        label="Notes" 
                        icon={<ReadOutlined />} 
                        isActive={isActive("/grades")} 
                    />
                    <NavItem 
                        href="/absences" 
                        label="Absences" 
                        icon={<ClockCircleOutlined />} 
                        isActive={isActive("/absences")} 
                    />
                </nav>

                {/* Footer Actions */}
                <div className="p-4 border-t border-backgroundSecondary space-y-2">
                    <button 
                        onClick={() => setSettingsModal(true)}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-textSecondary hover:bg-backgroundSecondary hover:text-textPrimary transition-colors text-sm font-medium"
                    >
                        <SettingOutlined /> Paramètres
                    </button>
                    
                    {session?.username && (
                        <button 
                            onClick={() => logoutMutation.mutate()}
                            disabled={logoutMutation.isPending}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-error hover:bg-error-container/20 transition-colors text-sm font-medium"
                        >
                            <LogoutOutlined /> Déconnexion
                        </button>
                    )}
                </div>
            </aside>

            {/* ================= MAIN CONTENT AREA ================= */}
            <main className="flex-1 h-full relative overflow-hidden flex flex-col">

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden bg-backgroundPrimary md:ml-6 p-2 md:rounded-lg">
                   <div className="mx-auto h-full">
                       {children}
                   </div>
                </div>

                {/* ================= MOBILE BOTTOM NAVIGATION ================= */}
                <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-backgroundPrimary border-t border-backgroundSecondary px-2 py-2 flex justify-around items-center z-30 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.05)] safe-area-pb">
                    
                    <MobileNavLink 
                        href="/" 
                        label="Agenda" 
                        icon={<CalendarOutlined />} 
                        isActive={isActive("/")} 
                    />
                    
                    <MobileNavLink 
                        href="/grades" 
                        label="Notes" 
                        icon={<ReadOutlined />} 
                        isActive={isActive("/grades")} 
                    />
                    
                    <MobileNavLink 
                        href="/absences" 
                        label="Absences" 
                        icon={<ClockCircleOutlined />} 
                        isActive={isActive("/absences")} 
                    />

                    <div className="w-px h-8 bg-backgroundSecondary mx-1" /> {/* Divider */}

                    <MobileNavButton
                        onClick={() => setSettingsModal(true)}
                        label="Réglages"
                        icon={<SettingOutlined />}
                    />

                    {session?.username && (
                        <MobileNavButton
                            onClick={() => logoutMutation.mutate()}
                            label="Sortir"
                            icon={<LogoutOutlined />}
                            isDestructive
                        />
                    )}
                </nav>
            </main>

            {/* Global Settings Modal */}
            {settingsModal && (
                <SettingsDialog 
                    isOpen={settingsModal} 
                    onClose={() => setSettingsModal(false)} 
                    onSave={() => {
                        setSettingsModal(false);
                        queryClient.invalidateQueries({ queryKey: ["calendar"]});

                        window.dispatchEvent(new Event("settings-changed"));
                        router.refresh();
                    }} 
                />
            )}
        </div>
    );
}