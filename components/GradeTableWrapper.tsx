"use client";
import { GradeTable } from "./GradeTable";
import { useEffect, useState } from "react";

export default function GradeTableWrapper({ session }: { session: any }) {
    const [gambling, setGambling] = useState(false);

    const updateSettings = () => {
        setGambling(localStorage.getItem("gambling") === "true");
    }

    useEffect(() => {
        updateSettings();

        window.addEventListener("settings-changed", updateSettings);

        return () => {
            window.removeEventListener("settings-changed", updateSettings);
        } 
    }, []);

    return <GradeTable session={session} gambling={gambling} />;
}