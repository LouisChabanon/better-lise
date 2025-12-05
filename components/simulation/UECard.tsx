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
			<div className="p-4 bg-backgroundSecondary border-b border-backgroundTertiary">
				<div className="flex flex-col gap-3">
					{/* Top Row: Icon + Title + Semester */}
					<div className="flex items-start justify-between">
						<div className="flex items-center gap-3 overflow-hidden">
							<div className="h-10 w-10 shrink-0 rounded-xl bg-primary-50 flex items-center justify-center text-primary text-lg shadow-inner">
								<BookOutlined />
							</div>
							<div className="min-w-0">
								<h3 className="font-bold text-textPrimary text-lg leading-tight truncate">
									{group.classCode}
								</h3>
								<span className="text-xs text-textTertiary font-mono bg-backgroundTertiary/50 px-1.5 py-0.5 rounded">
									{group.semester}
								</span>
							</div>
						</div>
					</div>

					{/* Stats Row */}
					<div className="flex items-center justify-between bg-backgroundPrimary/60 p-3 rounded-xl border border-backgroundTertiary/50">
						{/* Current Average */}
						<div className="flex flex-col">
							<span className="text-[10px] uppercase font-bold text-textQuaternary tracking-wider">
								Moyenne
							</span>
							<span className="text-xl font-bold text-textPrimary">
								{currentClassAvg.toFixed(2)}
							</span>
						</div>

						{/* Projected (if any) */}
						{hasSimulations && (
							<div className="flex items-center gap-3">
								<div className="w-px h-8 bg-backgroundTertiary"></div>
								<div className="flex flex-col items-end">
									<span className="text-[10px] uppercase font-bold text-textQuaternary tracking-wider flex items-center gap-1">
										<CalculatorOutlined /> Projeté
									</span>
									<div className="flex items-center gap-2">
										<span
											className={`text-xl font-bold ${
												classDiff >= 0
													? "text-badgeSuccessText"
													: "text-badgeDangerText"
											}`}
										>
											{projectedClassAvg.toFixed(2)}
										</span>
										<span
											className={`text-xs font-bold px-1.5 py-0.5 rounded ${
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
						)}
					</div>
				</div>
			</div>

			{/* Content List */}
			<div className="bg-backgroundPrimary">
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

				{/* Simulated Rows */}
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
