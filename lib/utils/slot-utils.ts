// Pure helpers for the slot machine grade reveal.
// Reels are indexed left to right: [tens, units, tenths, hundredths].

export const DIGITS_PER_LOOP = 10;
export const REEL_COUNT = 4;

const MAX_GRADE = 20;
const REDUCED_MOTION_SECONDS = 0.3;

type CubicBezier = [number, number, number, number];

// Indexed by stop order (hundredths first, tens last). Each more significant
// reel spins slower, waits longer, and crawls longer before landing.
const STOP_SECONDS = [1.2, 2.3, 3.8, 5.8];
const LOOPS_PER_SECOND = [5, 3.4, 2.1, 1.3];
const SPIN_EASES: CubicBezier[] = [
	[0.15, 0.55, 0.2, 1],
	[0.12, 0.65, 0.15, 1],
	[0.1, 0.72, 0.1, 1],
	[0.08, 0.8, 0.05, 1],
];

export function gradeToDigits(grade: number): number[] {
	const safe = Number.isFinite(grade)
		? Math.min(MAX_GRADE, Math.max(0, grade))
		: 0;
	const [integer, decimals] = safe.toFixed(2).split(".");
	return [...integer.padStart(2, "0"), ...decimals].map(Number);
}

// Least significant digit stops first: hundredths → 0, tens → 3
export function stopOrder(reelIndex: number): number {
	return REEL_COUNT - 1 - reelIndex;
}

export function reelDuration(reelIndex: number, reducedMotion = false): number {
	if (reducedMotion) return REDUCED_MOTION_SECONDS;
	return STOP_SECONDS[stopOrder(reelIndex)];
}

export function reelEase(reelIndex: number): CubicBezier {
	return SPIN_EASES[stopOrder(reelIndex)];
}

// Number of full 0-9 loops the reel scrolls through before landing
export function reelLoops(reelIndex: number, reducedMotion = false): number {
	if (reducedMotion) return 0;
	const order = stopOrder(reelIndex);
	return Math.max(1, Math.round(STOP_SECONDS[order] * LOOPS_PER_SECOND[order]));
}

export function buildStrip(loops: number): number[] {
	return Array.from(
		{ length: (loops + 1) * DIGITS_PER_LOOP },
		(_, i) => i % DIGITS_PER_LOOP,
	);
}

export function targetIndex(loops: number, digit: number): number {
	return loops * DIGITS_PER_LOOP + digit;
}
