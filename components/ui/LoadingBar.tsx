"use client";

import React from "react";
import { ApiOutlined, CheckCircleOutlined } from "@ant-design/icons";

interface LoadingBarProps {
    progress: number;
    message: string;
    waitText?: string;
}

export function LoadingBar({
    progress,
    message,
    waitText = "Opération en cours...",
}: LoadingBarProps) {
    const isFinished = progress >= 100;

    // Le scraping pur (le balayage) commence vers 10% et finit vers 95%.
    // On recalcule un pourcentage de 0 à 100 spécifiquement pour la position du laser.
    const scanPercent = Math.max(0, Math.min(100, ((progress - 10) / 60) * 100));

    // Définition des lignes fantômes de la page à scraper
    const skeletonRows = [
        { threshold: 15, width1: "100%", width2: "40%" },
        { threshold: 35, width1: "85%", width2: "60%" },
        { threshold: 55, width1: "95%", width2: "30%" },
        { threshold: 75, width1: "80%", width2: "50%" },
    ];

    return (
        <div className={`w-full flex flex-col items-center justify-center py-8 animate-in fade-in zoom-in-95 duration-500 ${isFinished ? "animate-out fade-out zoom-out-95 duration-300" : ""}`}>

            {/* Fenêtre abstraite représentant le site cible */}
            <div className="relative w-72 h-48 bg-backgroundPrimary border border-backgroundSecondary rounded-xl overflow-hidden shadow-lg mb-6">

                {/* En-tête de la fenêtre (Browser Chrome) */}
                <div className="h-7 bg-backgroundSecondary border-b border-buttonSecondaryBorder flex items-center px-3 gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-textTertiary/20" />
                    <div className="w-2.5 h-2.5 rounded-full bg-textTertiary/20" />
                    <div className="w-2.5 h-2.5 rounded-full bg-textTertiary/20" />
                    <div className="ml-auto w-1/3 h-2 bg-textTertiary/10 rounded-full" />
                </div>

                {/* Zone de contenu de la page */}
                <div className="p-4 relative h-[calc(100%-1.75rem)] flex flex-col justify-between">

                    {skeletonRows.map((row, idx) => {
                        // La ligne est considérée comme "extraite" quand le laser passe en dessous
                        const isExtracted = scanPercent > row.threshold;

                        return (
                            <div key={idx} className="flex justify-between items-center">
                                {/* Squelette du texte (titre de la matière) */}
                                <div className="flex flex-col gap-1.5 w-3/4">
                                    <div
                                        className={`h-2.5 rounded transition-colors duration-300 ${isExtracted ? "bg-textPrimary" : "bg-backgroundSecondary"}`}
                                        style={{ width: row.width1 }}
                                    />
                                    <div
                                        className={`h-1.5 rounded transition-colors duration-300 ${isExtracted ? "bg-textTertiary" : "bg-backgroundSecondary/50"}`}
                                        style={{ width: row.width2 }}
                                    />
                                </div>

                                {/* Badge de note extrait */}
                                <div
                                    className={`w-8 h-5 rounded shrink-0 transition-all duration-500 ease-out flex items-center justify-center
                                        ${isExtracted
                                            ? "bg-primary/10 border border-primary/30 scale-100 opacity-100"
                                            : "bg-backgroundSecondary scale-75 opacity-50 border border-transparent"
                                        }`}
                                >
                                    {isExtracted && <div className="w-3 h-1 bg-primary rounded-full animate-in zoom-in duration-300" />}
                                </div>
                            </div>
                        );
                    })}

                    {/* Le Laser / Scanner */}
                    <div
                        className={`absolute left-0 w-full h-12 -mt-6 bg-gradient-to-b from-transparent via-primary/10 to-transparent transition-all duration-150 ease-linear flex items-center justify-center
                            ${progress < 15 || progress > 98 ? "opacity-0" : "opacity-100"}`}
                        style={{ top: `${scanPercent}%` }}
                    >
                        {/* Ligne lumineuse centrale */}
                        <div className="w-full h-[1px] bg-primary shadow-[0_0_8px_rgba(var(--primary-rgb),0.8)]" />
                        <div className="absolute right-2 w-1.5 h-1.5 bg-primary rounded-full animate-ping" />
                    </div>

                    {/* Overlay initial : Connexion en cours (0% - 15%) */}
                    <div
                        className={`absolute inset-0 bg-backgroundPrimary/90 backdrop-blur-[2px] flex flex-col items-center justify-center transition-opacity duration-500 z-10
                            ${progress >= 15 ? "opacity-0 pointer-events-none" : "opacity-100"}`}
                    >
                        <ApiOutlined className="text-2xl text-primary animate-pulse mb-2" />
                        <span className="text-[10px] font-mono uppercase tracking-widest text-textTertiary">
                            Auth. Lise...
                        </span>
                    </div>

                </div>
            </div>

            {/* Zone d'affichage des messages dynamiques */}
            <div className="flex flex-col items-center h-14 relative overflow-hidden w-full text-center">
                <div className="flex items-center gap-3">
                    <span className="text-xl font-mono font-bold text-textPrimary w-12 text-right">
                        {Math.round(progress)}
                    </span>
                    <span className="text-sm font-bold text-textTertiary">%</span>
                </div>

                <span
                    key={message}
                    className="text-sm font-medium text-textSecondary mt-1 animate-in slide-in-from-bottom-2 fade-in duration-300 absolute bottom-0"
                >
                    {isFinished ? (
                        <span className="flex items-center gap-1 text-primary">
                            <CheckCircleOutlined /> Terminé
                        </span>
                    ) : message}
                </span>
            </div>

            {/* Message d'attente (si la requête est très longue) */}
            <p
                key={waitText}
                className="text-[10px] text-textTertiary mt-4 animate-in fade-in duration-500"
            >
                {progress > 5 && progress < 90 ? waitText : ""}
            </p>
        </div>
    );
}
