import { RealGradeWithCoeff, SimulatedGrade } from "@/lib/types";

export const parseClassCode = (fullCode: string) => {
	// Format: FITE_[semester]_[class]_[subclass]_...
	const parts = fullCode.split("_");
	if (parts.length >= 3) {
		return {
			semester: parts[1], // e.g. S7
			classCode: parts[2], // e.g. EEAA
			fullName: `${parts[1]} - ${parts[2]}`,
		};
	}
	return { semester: "Autre", classCode: "Autre", fullName: "Autre" };
};

export const getSemesterNumber = (sem: string) => {
	const match = sem.match(/S(\d+)/i);
	return match ? parseInt(match[1], 10) : 0;
};

export const calculateMean = (items: { grade: number; coeff: number }[]) => {
	let totalPoints = 0;
	let totalCoeff = 0;
	items.forEach((i) => {
		totalPoints += i.grade * i.coeff;
		totalCoeff += i.coeff;
	});
	return totalCoeff === 0 ? 0 : totalPoints / totalCoeff;
};
