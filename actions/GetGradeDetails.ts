"use server";
import prisma from '@/lib/db';
import { GradeType, GradeDetailType } from '@/lib/types';
import { unstable_cache } from 'next/cache';



function calculateMedian(grades: number[]): number {
  if(grades.length === 0) return 0
  const sorted = [...grades].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !==0 ? sorted[mid] : (sorted[mid-1] + sorted[mid])/2
}

function calculateStdDeviation(grades: number[], avg: number): number{
  if(grades.length === 0) return 0
  const variance = grades.reduce((acc, grade) => acc + Math.pow((grade - avg), 2), 0) / grades.length;
  return Math.sqrt(variance);
}

function calculateDistribution(grades: number[]): {labels: string[], counts: number[]} {
  const labels = ['0-2', '2-4', '4-6', '6-8', '8-10', '10-12', '12-14', '14-16', '16-18', '18-20']
  const counts = new Array(10).fill(0)

  grades.forEach(grade => {
    let binIndex = Math.floor(grade/2);

    if(grade === 20){
      binIndex = 9;
    }

    if(binIndex >= 0 && binIndex < counts.length){
      counts[binIndex]++;
    }
  });
  return {labels, counts}
}


async function GetAndCalculateGradeDetails(grade: GradeType): Promise<GradeDetailType> {
  
    try {    
    const aggregate = await prisma.grade.aggregate({
      _avg: { grade: true },
      _min: { grade: true },
      _max: { grade: true },
      _count: { grade: true },
      where: { code: grade.code },
    });

    const grades = await prisma.grade.findMany({
      select: {grade: true},
      where: {code: grade.code}
    })

    const gradeList = grades.map((g) => g.grade)

    const distrib = calculateDistribution(gradeList)

    const median = calculateMedian(gradeList)

    const stdDeviation = calculateStdDeviation(gradeList, aggregate._avg?.grade ?? 0);

    return {
    data: {
        avg: aggregate._avg?.grade ?? 0,
        min: aggregate._min?.grade ?? 0,
        max: aggregate._max?.grade ?? 0,
        count: aggregate._count?.grade ?? 0,
        median: median,
        stdDeviation: stdDeviation,
        distribution: distrib
    }
    };
  } catch (err: any) {
    return {errors: err}
  }
}

export default async function GetGradeDetails(grade: GradeType): Promise<GradeDetailType> {
  return unstable_cache(() => GetAndCalculateGradeDetails(grade), ['grade-details', grade.code], { revalidate: 3600 })();
}