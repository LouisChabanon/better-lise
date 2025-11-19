"use client";
import Agenda from "./Agenda";
import { useState } from "react";
import SettingsDialog from "./ui/SettingsDialog";

export default function AgendaWrapper() {
    const [settingsOpen, setSettingsOpen] = useState(false);
    
    return (
        <>
            <Agenda onSettingsClick={() => setSettingsOpen(true)} />
            <SettingsDialog 
                isOpen={settingsOpen} 
                onClose={() => setSettingsOpen(false)} 
                onSave={() => setSettingsOpen(false)} 
            />
        </>
    )
}