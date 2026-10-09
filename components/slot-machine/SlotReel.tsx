"use client";

import { m } from "framer-motion";
import { useMemo, useRef } from "react";
import {
	buildStrip,
	reelDuration,
	reelEase,
	reelLoops,
	stopOrder,
	targetIndex,
} from "@/lib/utils/slot-utils";

export const DIGIT_HEIGHT = 88;
const WINDOW_HEIGHT = DIGIT_HEIGHT * 1.6;
const STRIP_OFFSET = (WINDOW_HEIGHT - DIGIT_HEIGHT) / 2;
// The reel slightly overshoots its target then settles back, like a real reel catching
const OVERSHOOT = DIGIT_HEIGHT * 0.22;
const SETTLE_AT = 0.93;

interface SlotReelProps {
	reelIndex: number;
	digit: number;
	isStopped: boolean;
	isDimmed: boolean;
	landedColor: string;
	reducedMotion: boolean;
	onDigitPass: (order: number) => void;
	onStop: (reelIndex: number) => void;
}

export default function SlotReel({
	reelIndex,
	digit,
	isStopped,
	isDimmed,
	landedColor,
	reducedMotion,
	onDigitPass,
	onStop,
}: SlotReelProps) {
	const duration = reelDuration(reelIndex, reducedMotion);
	const loops = reelLoops(reelIndex, reducedMotion);
	const strip = useMemo(() => buildStrip(loops), [loops]);
	const landedIndex = targetIndex(loops, digit);
	const finalY = -landedIndex * DIGIT_HEIGHT;
	const lastIndex = useRef(0);

	const handleUpdate = (latest: { y?: number | string }) => {
		const y =
			typeof latest.y === "number" ? latest.y : parseFloat(String(latest.y));
		const index = Math.round(-y / DIGIT_HEIGHT);
		if (index !== lastIndex.current) {
			lastIndex.current = index;
			onDigitPass(stopOrder(reelIndex));
		}
	};

	return (
		<div
			className={`slot-reel relative w-12 sm:w-16 md:w-20 overflow-hidden rounded-lg bg-backgroundPrimary transition-shadow duration-500 ${
				isStopped ? "slot-reel--landed" : ""
			}`}
			style={
				{
					height: WINDOW_HEIGHT,
					"--landed-color": landedColor,
				} as React.CSSProperties
			}
		>
			<div className="slot-reel__window absolute inset-0">
				<m.div
					className={`absolute inset-x-0 flex flex-col transition-[filter,opacity] duration-300 ${
						isStopped ? "opacity-30" : "blur-[1.5px]"
					}`}
					style={{ top: STRIP_OFFSET }}
					initial={{ y: 0 }}
					animate={{ y: [0, finalY - OVERSHOOT, finalY] }}
					transition={{
						duration,
						times: [0, SETTLE_AT, 1],
						ease: [
							reelEase(reelIndex),
							[0.4, 0, 0.2, 1],
						],
					}}
					onUpdate={handleUpdate}
					onAnimationComplete={() => onStop(reelIndex)}
				>
					{strip.map((value, i) => (
						<span
							key={i}
							className="flex items-center justify-center text-5xl sm:text-6xl md:text-7xl font-black tabular-nums text-textPrimary"
							style={{
								height: DIGIT_HEIGHT,
								visibility:
									isStopped && i === landedIndex ? "hidden" : undefined,
							}}
						>
							{value}
						</span>
					))}
				</m.div>

				{isStopped && (
					<m.span
						aria-hidden
						className="absolute inset-x-0 flex items-center justify-center text-5xl sm:text-6xl md:text-7xl font-black tabular-nums transition-colors duration-500"
						style={{
							top: STRIP_OFFSET,
							height: DIGIT_HEIGHT,
							color: landedColor,
							opacity: isDimmed ? 0.25 : 1,
						}}
						initial={{ scale: 1.35, opacity: 0 }}
						animate={{ scale: 1, opacity: isDimmed ? 0.25 : 1 }}
						transition={{ type: "spring", stiffness: 500, damping: 18 }}
					>
						{digit}
					</m.span>
				)}
			</div>

			<style jsx>{`
				.slot-reel {
					box-shadow:
						inset 0 10px 14px -8px rgba(0, 0, 0, 0.45),
						inset 0 -10px 14px -8px rgba(0, 0, 0, 0.45);
				}
				.slot-reel__window {
					mask-image: linear-gradient(
						to bottom,
						transparent 0%,
						black 22%,
						black 78%,
						transparent 100%
					);
				}
				.slot-reel--landed {
					box-shadow:
						inset 0 0 0 2px var(--landed-color),
						inset 0 0 18px -4px var(--landed-color);
				}
			`}</style>
		</div>
	);
}
