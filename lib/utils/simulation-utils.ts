import { RealGradeWithCoeff, SimulatedGrade } from "@/lib/types";

export const parseClassCode = (fullCode: string) => {
	// Format: FITE_[semester]_[class]_[subclass]_...
	const parts = fullCode.split("_");
	const exclude_sem = ["GIE2", "GIE1", "GIM2", "GIM1"]; // Remove GIM2 GIM1 GIE2 GIE1 from parsing

	if (parts.length >= 3) {
		const semester = parts[1]; // e.g. S7
		let classCode = parts[2]; // e.g. EEAA

		if (exclude_sem.includes(parts[2])) {
			if (parts[3]) {
				classCode = parts[3]; // If it exist get the next field as name
				if (parts[3].startsWith("ED")) classCode = parts[4];
			} else {
				return { semester: "Autre", classCode: "Autre", fullName: "Autre" };
			}
		}
		return {
			semester: semester,
			classCode: classCode,
			fullName: `${semester} - ${classCode}`,
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
