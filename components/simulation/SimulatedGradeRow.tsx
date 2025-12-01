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
			initial={{ opacity: 0, height: 0 }}
			animate={{ opacity: 1, height: "auto" }}
			exit={{ opacity: 0, height: 0 }}
			className="p-3 pl-4 bg-backgroundSecondary/40 border-l-4 border-l-primary/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
		>
			<div className="flex flex-col min-w-0 flex-1">
				<span className="font-semibold text-textPrimary italic">
					{sim.name} (Simulé)
				</span>
				<span className="text-xs text-textTertiary">Coeff {sim.coeff}</span>
			</div>
			<div className="flex items-center gap-4 flex-1">
				<input
					type="range"
					min="0"
					max="20"
					step="0.5"
					value={sim.grade}
					onChange={(e) => onUpdate(parseFloat(e.target.value))}
					className="w-full h-1.5 bg-backgroundTertiary rounded-lg appearance-none cursor-pointer accent-primary"
				/>
				<div className="flex items-center gap-2">
					<span
						className={`text-base font-bold min-w-[3rem] text-center ${
							sim.grade >= 10 ? "text-green-600" : "text-red-500"
						}`}
					>
						{sim.grade}
					</span>
					<button
						onClick={onDelete}
						className="text-textQuaternary hover:text-red-500 transition-colors p-2 rounded-full hover:bg-backgroundSecondary shrink-0"
					>
						<DeleteOutlined />
					</button>
				</div>
			</div>
		</motion.div>
	);
}
