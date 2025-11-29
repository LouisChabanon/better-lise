export function randomGrade(): number {
	return Math.random() * 20;
}

// Function to generate random grades from normal distribution
// using Box-Muller transform : https://stackoverflow.com/questions/25582882/javascript-math-random-normal-distribution-gaussian-bell-curve
// Currently not beeing used because randomGrade() is more fun
export function randomGaussianGrade(): number {
	const u = 1 - Math.random();
	const v = Math.random();
	const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);

	const mean = 10;
	const stDev = 2;
	let grade = z * stDev + mean;
	grade = Math.max(0, Math.min(20, grade));

	return grade;
}

export function getRarity(grade: number) {
	if (grade >= 18)
		return { rarity: "Legendary", color: "oklch(82.8% 0.189 84.429)" };
	if (grade >= 14)
		return { rarity: "Epic", color: "oklch(51.8% 0.253 323.949)" };
	if (grade >= 10)
		return { rarity: "Common", color: "oklch(54.6% 0.245 262.881)" };
	if (grade >= 7)
		return { rarity: "Basic", color: "oklch(55.3% 0.195 38.402)" };
	return { rarity: "Poor", color: "oklch(50.5% 0.213 27.518)" };
}
