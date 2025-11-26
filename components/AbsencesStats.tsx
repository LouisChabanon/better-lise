"use client";
import { useAbsencesData } from "@/hooks/useAbsencesData";

export default function AbsencesStats({session}: { session: any }){
    const { data, isLoading } = useAbsencesData(session);

    return (
        <>
            <h2 className="text-xl font-semibold text-textPrimary mb-4">
                Mes Absences
            </h2>
            <div className="p-2 flex flex-wrap gap-4 sm:gap-6">
                <div className="flex items-center space-x-2">
                    <span className="text-sm font-semibold text-textSecondary">Nombre total d'absences:</span>
                    <span className="text-sm font-medium text-textPrimary px-2 py-0.5 bg-backgroundTertiary rounded-md sensitive">
                        {isLoading ? "--" : data?.nbTotalAbsences}
                    </span>
                </div>
                <div className="flex items-center space-x-2">
                    <span className="text-sm font-semibold text-textSecondary">Durée totale des absences:</span>
                    <span className="text-sm font-medium text-textPrimary px-2 py-0.5 bg-backgroundTertiary rounded-md sensitive">
                        {isLoading ? "--:--" : data?.dureeTotaleAbsences}
                    </span>
                </div>                
            </div>
        </>
    )
}