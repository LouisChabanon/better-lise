"use client";

import { AnimatePresence } from "framer-motion";
import { BookOutlined, CalculatorOutlined } from "@ant-design/icons";
import RealGradeRow from "./RealGradeRow";
import SimulatedGradeRow from "./SimulatedGradeRow";
import { ClassGroup, RealGradeWithCoeff } from "@/lib/types";
import { calculateMean } from "@/lib/utils/simulation-utils";

export default function UECard({
	group,
	getEffectiveCoeff,
	onLocalCoeffChange,
	onClassOverride,
	onWeightSubmitSuccess,
	onUpdateSim,
	onDeleteSim,
}: {
	group: ClassGroup;
	getEffectiveCoeff: (g: RealGradeWithCoeff) => number;
	onLocalCoeffChange: (code: string, val: number) => void;
	onClassOverride: (code: string, newClass: string) => void;
	onWeightSubmitSuccess: (code: string, val: number) => void;
	onUpdateSim: (id: string, val: number) => void;
	onDeleteSim: (id: string) => void;
}) {
	const realItems = group.real.map((g) => ({
		grade: Number(g.note),
		coeff: getEffectiveCoeff(g),
	}));
	const simItems = group.sim.map((s) => ({
		grade: s.grade,
		coeff: s.coeff,
	}));

	const currentClassAvg = calculateMean(realItems);
	const projectedClassAvg = calculateMean([...realItems, ...simItems]);
	const classDiff = projectedClassAvg - currentClassAvg;
	const hasSimulations = group.sim.length > 0;

	return (
		<div className="bg-backgroundPrimary border border-backgroundTertiary rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
			{/* Header */}
			<div className="p-4 bg-backgroundSecondary border-b border-backgroundTertiary transition-colors duration-300">
				<div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
					{/* Title Section */}
					<div className="flex items-center gap-3">
						<div className="h-10 w-10 rounded-xl bg-primary-50 flex items-center justify-center text-primary text-lg shadow-inner transition-colors duration-300">
							<BookOutlined />
						</div>
						<div>
							<h3 className="font-bold text-textPrimary text-lg leading-tight">
								{group.classCode}
							</h3>
							<span className="text-xs text-textTertiary font-mono bg-backgroundTertiary/50 px-1.5 py-0.5 rounded transition-colors duration-300">
								{group.semester}
							</span>
						</div>
					</div>

					{/* Averages Section */}
					<div className="flex items-center gap-2 sm:gap-4 bg-backgroundPrimary/50 p-2 rounded-xl border border-backgroundTertiary/50 self-start sm:self-auto w-full sm:w-auto justify-between sm:justify-end transition-colors duration-300">
						{/* Current Avg */}
						<div className="flex items-center gap-3 px-2">
							<div className="text-right">
								<p className="text-[9px] uppercase font-bold text-textQuaternary tracking-wider">
									Moyenne
								</p>
								<p className="text-lg font-bold text-textPrimary">
									{currentClassAvg.toFixed(2)}
								</p>
							</div>
						</div>

						{/* Projected Avg (Only if Sim) */}
						{hasSimulations && (
							<>
								<div className="w-px h-8 bg-backgroundTertiary transition-colors duration-300"></div>
								<div className="flex items-center gap-3 px-2">
									<div className="text-right">
										<p className="text-[9px] uppercase font-bold text-textQuaternary tracking-wider flex items-center justify-end gap-1">
											<CalculatorOutlined className="text-[10px]" /> Projetée
										</p>
										<div className="flex items-center justify-end gap-1.5">
											<p
												className={`text-lg font-bold transition-colors duration-300 ${
													classDiff >= 0
														? "text-badgeSuccessText"
														: "text-badgeDangerText"
												}`}
											>
												{projectedClassAvg.toFixed(2)}
											</p>
											<span
												className={`text-[10px] font-bold px-1 rounded transition-colors duration-300 ${
													classDiff >= 0
														? "bg-badgeSuccessBg text-badgeSuccessText"
														: "bg-badgeDangerBg text-badgeDangerText"
												}`}
											>
												{classDiff > 0 ? "+" : ""}
												{classDiff.toFixed(2)}
											</span>
										</div>
									</div>
								</div>
							</>
						)}
					</div>
				</div>
			</div>

			{/* Content */}
			<div className="bg-backgroundPrimary transition-colors duration-300">
				{group.real.map((g) => (
					<RealGradeRow
						key={g.code}
						grade={g}
						effectiveCoeff={getEffectiveCoeff(g)}
						onCoeffChange={(val) => onLocalCoeffChange(g.code, val)}
						onOverrideClass={(newClass) => onClassOverride(g.code, newClass)}
						onWeightSubmitSuccess={onWeightSubmitSuccess}
					/>
				))}

				{/* Simulations Section */}
				<AnimatePresence>
					{group.sim.map((sim) => (
						<SimulatedGradeRow
							key={sim.id}
							sim={sim}
							onUpdate={(v) => onUpdateSim(sim.id, v)}
							onDelete={() => onDeleteSim(sim.id)}
						/>
					))}
				</AnimatePresence>
			</div>
		</div>
	);
}
