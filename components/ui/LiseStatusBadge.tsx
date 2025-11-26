"use client";

import { useEffect, useState } from "react";
import { getLiseHealth } from "@/actions/GetLiseHealth";
import { motion, AnimatePresence } from "framer-motion";
import { InfoCircleOutlined, ThunderboltFilled, WifiOutlined } from "@ant-design/icons";

export default function LiseStatusBadge({ discrete = false }: { discrete?: boolean }) {
    const [stats, setStats] = useState<{ avgDuration: number; count: number } | null>(null);
    const [loading, setLoading] = useState(true);
    const [isHovered, setIsHovered] = useState(false);

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

    // --- Logic Definition ---
    let statusConfig = {
        color: "bg-emerald-500",
        textColor: "text-emerald-700 dark:text-emerald-400",
        borderColor: "border-emerald-200/50 dark:border-emerald-800/30",
        bgColor: "bg-emerald-50/50 dark:bg-emerald-900/20",
        label: "Opérationnel",
        description: "Lise répond normalement.",
        icon: <ThunderboltFilled />
    };

    if (isLowData) {
        statusConfig = {
            color: "bg-gray-400",
            textColor: "text-textSecondary",
            borderColor: "border-gray-200/50 dark:border-gray-700/50",
            bgColor: "bg-gray-100/50 dark:bg-gray-800/30",
            label: "Données insuffisantes",
            description: "Pas assez de connexions dans l'heure pour évaluer.",
            icon: <InfoCircleOutlined />
        };
    } else if (avgDuration > 20000) {
        statusConfig = {
            color: "bg-rose-500",
            textColor: "text-rose-700 dark:text-rose-400",
            borderColor: "border-rose-200/50 dark:border-rose-800/30",
            bgColor: "bg-rose-50/50 dark:bg-rose-900/20",
            label: "Lent",
            description: "Le serveur Lise est très lent",
            icon: <WifiOutlined />
        };
    } else if (avgDuration > 15000) {
        statusConfig = {
            color: "bg-amber-500",
            textColor: "text-amber-700 dark:text-amber-400",
            borderColor: "border-amber-200/50 dark:border-amber-800/30",
            bgColor: "bg-amber-50/50 dark:bg-amber-900/20",
            label: "Lent",
            description: "Temps de réponse supérieur à la normale.",
            icon: <WifiOutlined />
        };
    }

    return (
        <div 
            className="relative z-50"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* BADGE */}
            <div className={`inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full border cursor-help transition-colors duration-300 ${statusConfig.bgColor} ${statusConfig.borderColor}`}>
                <div className="relative flex items-center justify-center h-3 w-3">
                    {isLowData ? (
                        <span className="relative inline-flex items-center justify-center h-3.5 w-3.5 rounded-full bg-textQuaternary text-[9px] font-bold text-white leading-none">
                            ?
                        </span>
                    ) : (
                        <>
                            {!isLowData && avgDuration > 10000 && (
                                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${statusConfig.color}`}></span>
                            )}
                            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${statusConfig.color}`}></span>
                        </>
                    )}
                </div>
                <div className={`text-xs font-medium ${statusConfig.textColor} flex leading-none gap-0.5`}>
                    <span className="opacity-90 hidden sm:inline">
                        Lise :
                    </span>
                    <span className="font-bold">
                        {isLowData ? "Inconnu" : `${(avgDuration / 1000).toFixed(1)}s`}
                    </span>
                </div>
            </div>

            {/* TOOLTIP */}
            <AnimatePresence>
                {isHovered && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 5, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-64 p-4 bg-backgroundPrimary/95 backdrop-blur-md border border-backgroundSecondary shadow-xl rounded-2xl text-left"
                    >
                        {/* Arrow */}
                        <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-backgroundPrimary border-t border-l border-backgroundSecondary rotate-45" />

                        {/* Header */}
                        <div className="flex items-start gap-3 mb-3">
                            <div className={`p-2 rounded-lg ${statusConfig.bgColor} ${statusConfig.textColor}`}>
                                {statusConfig.icon}
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-textPrimary">État : {statusConfig.label}</h4>
                                <p className="text-xs text-textTertiary leading-tight mt-1">{statusConfig.description}</p>
                            </div>
                        </div>

                        {/* Metrics */}
                        {!isLowData && (
                            <div className="space-y-2 pt-3 border-t border-border/50">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-textSecondary">Temps moyen</span>
                                    <span className={`font-mono font-semibold ${statusConfig.textColor}`}>
                                        {(avgDuration / 1000).toFixed(2)} s
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-textSecondary">Echantillon (1h)</span>
                                    <span className="font-mono font-semibold text-textPrimary">
                                        {count} requêtes
                                    </span>
                                </div>
                            </div>
                        )}
                        
                        {/* Footer for Low Data */}
                        {isLowData && (
                            <div className="pt-2 border-t border-border/50">
                                <p className="text-[10px] text-textQuaternary text-center">
                                    En attente de plus de données utilisateurs...
                                </p>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}