"use client";

import React, { useEffect, useState } from "react";
import { GradeType } from "@/lib/types";
import GetGradeDetails from "@/actions/GetGradeDetails";
import { Button } from "./Button";

interface GradeModalProps {
    grade: GradeType;
    onClose?: () => void;
}

export default function GradeModal({ grade, onClose }: GradeModalProps) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<{ avg: number | null; min: number | null; max: number | null; count: number } | null>(null);

    useEffect(() => {
        let mounted = true;
        async function load() {
            setLoading(true);
            setError(null);
            const gradeDetails = await GetGradeDetails(grade)
            if (gradeDetails.errors || gradeDetails.data == null){
                setError(gradeDetails.errors || "Erreur lors du chargement")
            }
            if(gradeDetails.data){
                setData(gradeDetails.data)
            }
            setLoading(false)
        }
        load();
        return () => { mounted = false; };
    }, [grade.code]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-backgroundPrimary p-6 rounded-lg max-w-sm w-full">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-semibold">Détails - {grade.libelle}</h3>
                    <Button onClick={() => onClose && onClose()} status="secondary">✕</Button>
                </div>

                {loading && <div className="text-center text-textTertiary">
                    <svg className="mr-3 size-5 animate-spin inline-block" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4}></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>Chargement…</div>}
                {error && <div className="text-error">{error}</div>}

                {!loading && !error && data && (
                    <div className="space-y-2">
                        <div className="flex justify-between"><span className="font-medium">Moyenne</span><span>{data.avg !== null ? data.avg.toFixed(2) : "—"}</span></div>
                        <div className="flex justify-between"><span className="font-medium">Minimum</span><span>{data.min !== null ? data.min : "—"}</span></div>
                        <div className="flex justify-between"><span className="font-medium">Maximum</span><span>{data.max !== null ? data.max : "—"}</span></div>
                        <div className="flex justify-between"><span className="font-medium">Echantillon</span><span>{data.count}</span></div>
                    </div>
                )}
            </div>
        </div>
    );
}