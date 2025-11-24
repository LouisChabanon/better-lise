"use client";

import { useEffect, useState } from "react";
import { getLiseHealth } from "@/actions/GetLiseHealth";

export default function LiseStatusBadge({discrete=false}: {discrete?: boolean}) {
    const [stats, setStats] = useState<{ avgDuration: number; count: number } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchLiseHealth() {
            try {
                const data = await getLiseHealth();
                setStats(data);
            } catch (error) {
                console.error("Failed to fetch health stats");
            } finally {
                setLoading(false);
            }
        }

        fetchLiseHealth();
    }, []);

    

    if (loading && !discrete) {
        return (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border/50 bg-backgroundSecondary/50 animate-pulse">
                <div className="h-2.5 w-2.5 rounded-full bg-textQuaternary/30"></div>
                <div className="h-3 w-16 rounded bg-textQuaternary/30"></div>
            </div>
        );
    }

    if (!stats) return null;

    const { avgDuration, count } = stats;
    const isLowData = count < 4;

    if (discrete && isLowData) return null;
    if (discrete && avgDuration < 15000) return null;

    // --- Color Logic ---
    let colorDot = "bg-emerald-500";
    let colorPing = "bg-emerald-500";
    let textColor = "text-emerald-700 dark:text-emerald-400";
    let borderColor = "border-emerald-200/50 dark:border-emerald-800/30";
    let bgColor = "bg-emerald-50/50 dark:bg-emerald-900/20";

    if (isLowData) {
        colorDot = "bg-gray-400";
        textColor = "text-textSecondary";
        borderColor = "border-gray-200/50 dark:border-gray-700/50";
        bgColor = "bg-gray-100/50 dark:bg-gray-800/30";
    } else if (avgDuration > 20000) {
        colorDot = "bg-rose-500";
        colorPing = "bg-rose-500";
        textColor = "text-rose-700 dark:text-rose-400";
        borderColor = "border-rose-200/50 dark:border-rose-800/30";
        bgColor = "bg-rose-50/50 dark:bg-rose-900/20";
    } else if (avgDuration > 15000) {
        colorDot = "bg-amber-500";
        colorPing = "bg-amber-500";
        textColor = "text-amber-700 dark:text-amber-400";
        borderColor = "border-amber-200/50 dark:border-amber-800/30";
        bgColor = "bg-amber-50/50 dark:bg-amber-900/20";
    }

    return (
        <div className={`inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full border ${bgColor} ${borderColor}`}>
            <div className="relative flex items-center justify-center h-3 w-3">
                {isLowData ? (
                    <span className="relative inline-flex items-center justify-center h-3.5 w-3.5 rounded-full bg-textQuaternary text-[9px] font-bold text-white leading-none">
                        ?
                    </span>
                ) : (
                    <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${colorDot}`}></span>
                )}
            </div>
            <div className={`text-xs font-medium ${textColor} flex leading-none gap-0.5`}>
                <span className="opacity-90">
                    {isLowData ? "Statut Lise :" : "Lise :"}
                </span>
                <span className="font-bold">
                    {isLowData ? "Inconnu" : `${(avgDuration / 1000).toFixed(2)}s`}
                </span>
            </div>
        </div>
    );
}