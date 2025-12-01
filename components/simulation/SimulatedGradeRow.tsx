"use client";

import { motion } from "framer-motion";
import { DeleteOutlined } from "@ant-design/icons";
import { SimulatedGrade } from "@/lib/types";

export default function SimulatedGradeRow({
	sim,
	onUpdate,
	onDelete,
}: {
	sim: SimulatedGrade;
	onUpdate: (v: number) => void;
	onDelete: () => void;
}) {
	return (
		<motion.div
			initial={{ opacity: 0, height: 0, y: -10 }}
			animate={{ opacity: 1, height: "auto", y: 0 }}
			exit={{ opacity: 0, height: 0, y: -10 }}
			className="relative p-4 bg-gradient-to-r from-primary-50/50 to-transparent border-t border-primary-50 flex flex-col gap-3 group transition-colors duration-300"
		>
			{/* Top Row: Info & Delete */}
			<div className="flex justify-between items-start">
				<div className="flex flex-col">
					<div className="flex items-center gap-2">
						<span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary-100/50 text-primary uppercase tracking-wide">
							Simulé
						</span>
						<span className="font-semibold text-textPrimary text-sm">
							{sim.name}
						</span>
					</div>
					<span className="text-xs text-textTertiary mt-0.5 ml-0.5">
						Coefficient: {sim.coeff}
					</span>
				</div>

				<button
					onClick={onDelete}
					className="text-textQuaternary hover:text-badgeDangerText hover:bg-badgeDangerBg p-2 rounded-full transition-all active:scale-90"
					aria-label="Supprimer la simulation"
				>
					<DeleteOutlined />
				</button>
			</div>

			{/* Bottom Row: Controls */}
			<div className="flex items-center gap-4 bg-backgroundSecondary/50 p-2 rounded-xl border border-primary-50 transition-colors duration-300">
				<input
					type="range"
					min="0"
					max="20"
					step="0.5"
					value={sim.grade}
					onChange={(e) => onUpdate(parseFloat(e.target.value))}
					className="flex-1 h-2 bg-backgroundTertiary rounded-full appearance-none cursor-pointer accent-primary touch-none"
				/>

				<span
					className={`text-lg font-bold min-w-[3rem] text-center px-2 py-1 rounded-lg border shadow-sm transition-colors duration-300 ${
						sim.grade >= 10
							? "bg-badgeSuccessBg text-badgeSuccessText border-badgeSuccessText/20"
							: "bg-badgeDangerBg text-badgeDangerText border-badgeDangerText/20"
					}`}
				>
					{sim.grade}
				</span>
			</div>
		</motion.div>
	);
}
