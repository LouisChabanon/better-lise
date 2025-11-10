"use client";

import { useQuery } from "@tanstack/react-query";
import { getGradeData } from "@/actions/GetGrades";
import { GradeType } from "@/lib/types";


export const useGradesData = (session: any) => {

    return useQuery({
        queryKey: ["grades", session?.username],
        queryFn: async () => {
            const res = await getGradeData(true);
            if(!res.success || !res.data){
                throw new Error(res.errors || "Failed to fetch grades")
            }

            const gradeItems = (res.data as GradeType[]).filter((g: any) => typeof g?.date !== 'undefined');
            const sorted = gradeItems.sort((a: any, b: any) => {
                const [dayA, monthA, yearA] = a.date.split('/').map(Number);
                const [dayB, monthB, yearB] = b.date.split('/').map(Number);
                const timeA = new Date(yearA, monthA - 1, dayA).getTime();
                const timeB = new Date(yearB, monthB - 1, dayB).getTime();
                return timeB - timeA;
            });

            const sortedByNew = sorted.sort((a: any, b: any) => {
                const aIsNew = !!a?.isNew;
                const bIsNew = !!b?.isNew;
                if (aIsNew && !bIsNew) return -1;
                if (!aIsNew && bIsNew) return 1;
                return 0;
            });

            return sortedByNew;
        },
        enabled: !!session?.username,
    })
}