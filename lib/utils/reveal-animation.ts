// Which mini-game hides a new grade when "Mode Casino" is on

export type RevealAnimation = "case" | "slot";

export const REVEAL_ANIMATION_KEY = "reveal_animation";
export const DEFAULT_REVEAL_ANIMATION: RevealAnimation = "case";

export const REVEAL_ANIMATION_OPTIONS: {
	value: RevealAnimation;
	label: string;
}[] = [
	{ value: "case", label: "Mode 1" },
	{ value: "slot", label: "Mode 2" },
];

export function isRevealAnimation(value: unknown): value is RevealAnimation {
	return value === "case" || value === "slot";
}

export function readRevealAnimation(): RevealAnimation {
	try {
		const stored = localStorage.getItem(REVEAL_ANIMATION_KEY);
		return isRevealAnimation(stored) ? stored : DEFAULT_REVEAL_ANIMATION;
	} catch {
		return DEFAULT_REVEAL_ANIMATION;
	}
}
