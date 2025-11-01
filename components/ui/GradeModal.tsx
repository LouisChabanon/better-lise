"use client";

import React, { useEffect, useState } from "react";
import { GradeType } from "@/lib/types";
import GetGradeDetails from "@/actions/GetGradeDetails";
import { Button } from "./Button";
import GradeChart from "./GradeChart";

interface GradeModalProps {
    grade: GradeType;
    onClose?: () => void;
}

type GradeDetail = {
    avg: number,
    min: number,
    max: number,
    count: number,
    median: number,
    stdDeviation: number,
    distribution: {
    labels: string[],
    counts: number[]
    };
}

export default function GradeModal({ grade, onClose }: GradeModalProps) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<GradeDetail | null>(null);

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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-backgroundPrimary p-6 rounded-lg w-full max-w-lg lg:max-w-4xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6 gap-4">
                    <div className="flex flex-col min-w-0">
                        <h3 className="text-lg font-semibold text-textPrimary truncate">Détails - {grade.libelle}</h3>
                        <p className="text-sm text-textTertiary break-words">{grade.code}</p>
                    </div>
                    <Button onClick={() => onClose && onClose()} status="secondary">✕</Button>
                </div>

                {loading && <div className="text-center text-textTertiary">
                    <svg className="mr-3 size-5 animate-spin inline-block" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4}></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>Chargement…</div>}
                {error && <div className="text-error">{error}</div>}

                {!loading && !error && data && (
                    <div className="lg:flex lg:flex-row lg:gap-8">
                        <div className="lg:w-2/5 divide-y divide-y-backgroundSecondary/50 mt-6 lg:mt-0">
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2 pb-4">
                                {grade.absence && (<>
                                    <span className="font-medium text-textSecondary">Motif Absence</span>
                                    <span className="font-bold text-lg text-textPrimary text-right">{grade.absence}</span></>)}
                                {grade.comment && (<>
                                    <span className="font-medium text-textSecondary">Appréciation :</span>
                                    <span className="font-bold text-lg text-textPrimary text-right">{grade.comment}</span></>)}
                                <span className="font-medium text-textSecondary ">Intervenants</span><span className="text-right">{grade.teachers}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-4 py-4">
                                <span className="font-medium text-textSecondary">Moyenne</span>
                                <span className="font-semibold text-lg text-textPrimary text-right">{data.avg !== null ? data.avg.toFixed(2) : "—"}</span>
                                <span className="font-medium text-textSecondary">Medianne</span>
                                <span className="font-semibold text-lg text-textPrimary text-right">{data.median !== null ? data.median.toFixed(2) : "—"}</span>
                                <span className="font-medium text-textSecondary">Ecart Type</span>
                                <span className="font-semibold text-lg text-textPrimary text-right">{data.stdDeviation !== null ? data.stdDeviation.toFixed(2) : "—"}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2 py-4">
                                <span className="font-medium text-textSecondary">Minimum</span>
                                <span className="font-semibold text-lg text-textPrimary text-right">{data.min !== null ? data.min : "—"}</span>
                                <span className="font-medium text-textSecondary">Maximum</span>
                                <span className="font-semibold text-lg text-textPrimary text-right">{data.max !== null ? data.max : "—"}</span>
                                <span className="font-medium text-textSecondary">Echantillon</span>
                                <span className="font-semibold text-lg text-textPrimary text-right">{data.count}</span>
                            </div>
                        </div>
                        <div className="lg:w-3/5">
                            {data.distribution && data.distribution.counts.length > 0 ? (
                                <GradeChart distributionData={data.distribution} userGrade={grade.note} />
                            ) : (
                                <div className="text-center text-textTertiary h-64 flex items-center justify-center">
                                    Pas de données à afficher.
                                </div>
                            )}
                        </div>

                    </div>
                )}
            </div>
        </div>
    );
}