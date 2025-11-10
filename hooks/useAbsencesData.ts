"use client";

import { useQuery } from "@tanstack/react-query";
import { getAbsenceData } from "@/actions/GetAbsences";
import { AbsenceType } from "@/lib/types";


export const useAbsencesData = (session: any) => {

    return useQuery({
        queryKey: ["absences", session?.username],
        queryFn: async () => {
            const res = await getAbsenceData(true);
            if(!res.success || !res.data){
                throw new Error(res.errors || "Failed to fetch absences")
            }

            const absenceItems = (res.data.absences as AbsenceType[]).filter((a: any) => typeof a?.date !== 'undefined');
            const sorted = absenceItems.sort((a: any, b: any) => {
                const [dayA, monthA, yearA] = a.date.split('/').map(Number);
                const [dayB, monthB, yearB] = b.date.split('/').map(Number);
                const timeA = new Date(yearA, monthA - 1, dayA).getTime();
                const timeB = new Date(yearB, monthB - 1, dayB).getTime();
                return timeB - timeA;
            });

            return {...res.data, absences: sorted};
        },
        enabled: !!session?.username,
    })
}