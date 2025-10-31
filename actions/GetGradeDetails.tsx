"use server";
import prisma from '@/lib/db';
import { GradeType } from '@/lib/types';


export type GradeDetailResponse = {
    errors?: string,
    data?: {
        avg: number,
        min: number,
        max: number,
        count: number
    }
}

export default async function GetGradeDetails(grade: GradeType): Promise<GradeDetailResponse> {
  
    try {    
    const aggregate = await prisma.grade.aggregate({
      _avg: { grade: true },
      _min: { grade: true },
      _max: { grade: true },
      _count: { grade: true },
      where: { code: grade.code },
    });

    return {
    data: {
        avg: aggregate._avg?.grade ?? 0,
        min: aggregate._min?.grade ?? 0,
        max: aggregate._max?.grade ?? 0,
        count: aggregate._count?.grade ?? 0,
    }
    };
  } catch (err: any) {
    return {errors: err}
  }
}