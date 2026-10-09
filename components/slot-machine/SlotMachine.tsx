"use client";

import { useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { getRarity } from "@/lib/utils/game-utils";
import { celebrate } from "@/lib/utils/confetti";
import { REEL_COUNT, gradeToDigits } from "@/lib/utils/slot-utils";
import SlotReel from "./SlotReel";

const COMPLETE_DELAY_MS = 3000;
const CELEBRATION_THRESHOLD = 10;
const TENS_REEL = 0;
const DECIMAL_SEPARATOR_AFTER = 1;
// Landed digits stay neutral until the last reel stops, so the rarity colour
// doesn't give the grade range away early
const NEUTRAL_LANDED_COLOR = "var(--text-primary)";

interface SlotMachineProps {
	grade: number;
	onComplete?: () => void;
	onTick?: () => void;
	onReveal?: () => void;
}

export default function SlotMachine({
	grade,
	onComplete,
	onTick,
	onReveal,
}: SlotMachineProps) {
	const reducedMotion = useReducedMotion() ?? false;
	const digits = gradeToDigits(grade);
	const { color } = getRarity(grade);
	const [stoppedReels, setStoppedReels] = useState<ReadonlySet<number>>(
		new Set(),
	);
	const stoppedCount = useRef(0);
	const isRevealed = stoppedReels.size === REEL_COUNT;

	// Only the next reel to stop ticks, so the sound slows down as it lands
	const handleDigitPass = useCallback(
		(order: number) => {
			if (order === stoppedCount.current) onTick?.();
		},
		[onTick],
	);

	const handleStop = useCallback(
		(reelIndex: number) => {
			stoppedCount.current += 1;
			onTick?.();
			setStoppedReels((prev) => new Set(prev).add(reelIndex));
		},
		[onTick],
	);

	useEffect(() => {
		if (!isRevealed) return;
		onReveal?.();
		const cancelConfetti =
			grade >= CELEBRATION_THRESHOLD ? celebrate() : undefined;
		const timeout = onComplete
			? setTimeout(onComplete, COMPLETE_DELAY_MS)
			: undefined;
		return () => {
			cancelConfetti?.();
			clearTimeout(timeout);
		};
		// Fire once when the last reel lands
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isRevealed]);

	return (
		<div className="flex flex-col items-center gap-3">
			<div
				role="img"
				aria-label={
					isRevealed
						? `Note : ${grade.toFixed(2)} sur 20`
						: "Révélation de la note en cours"
				}
				className="relative flex items-end gap-1.5 md:gap-2 rounded-2xl border-4 border-backgroundTertiary bg-backgroundSecondary p-3 md:p-4 shadow-[0_12px_30px_-12px_rgba(0,0,0,0.5)]"
			>
				<span
					aria-hidden
					className="pointer-events-none absolute inset-x-2 top-1/2 h-px -translate-y-1/2 bg-textQuaternary/40 z-10"
				/>
				{digits.map((digit, reelIndex) => (
					<div key={reelIndex} className="flex items-end gap-1.5 md:gap-2">
						<SlotReel
							reelIndex={reelIndex}
							digit={digit}
							isStopped={stoppedReels.has(reelIndex)}
							isDimmed={reelIndex === TENS_REEL && digit === 0}
							landedColor={isRevealed ? color : NEUTRAL_LANDED_COLOR}
							reducedMotion={reducedMotion}
							onDigitPass={handleDigitPass}
							onStop={handleStop}
						/>
						{reelIndex === DECIMAL_SEPARATOR_AFTER && (
							<span
								aria-hidden
								className="self-center text-4xl md:text-5xl font-black text-textTertiary"
							>
								.
							</span>
						)}
					</div>
				))}
				<span
					aria-hidden
					className="hidden sm:inline self-center pl-1 md:pl-2 text-xl md:text-2xl font-bold text-textTertiary"
				>
					/20
				</span>
			</div>
			<p className="sr-only" aria-live="polite">
				{isRevealed ? `Note révélée : ${grade.toFixed(2)} sur 20` : ""}
			</p>
		</div>
	);
}
