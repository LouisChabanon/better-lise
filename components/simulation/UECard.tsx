"use client";

import { AnimatePresence } from "framer-motion";
import { BookOutlined } from "@ant-design/icons";
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

	return (
		<div className="bg-backgroundPrimary border border-backgroundTertiary rounded-2xl overflow-hidden shadow-sm">
			<div className="p-4 bg-backgroundSecondary/30 border-b border-backgroundTertiary flex flex-wrap justify-between items-center gap-4">
				<div className="flex items-center gap-3">
					<div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl">
						<BookOutlined />
					</div>
					<div>
						<h3 className="font-bold text-textPrimary text-lg">
							{group.classCode}
						</h3>
						<span className="text-xs text-textTertiary font-mono">
							{group.semester}
						</span>
					</div>
				</div>
				<div className="flex items-center gap-6">
					<div className="text-right">
						<p className="text-[10px] uppercase font-bold text-textQuaternary">
							Moyenne
						</p>
						<p className="text-xl font-bold text-textPrimary">
							{currentClassAvg.toFixed(2)}
						</p>
					</div>
					{group.sim.length > 0 && (
						<div className="text-right">
							<p className="text-[10px] uppercase font-bold text-textQuaternary">
								Projetée
							</p>
							<div className="flex items-center gap-1">
								<p
									className={`text-xl font-bold ${
										classDiff >= 0 ? "text-green-600" : "text-red-500"
									}`}
								>
									{projectedClassAvg.toFixed(2)}
								</p>
								<span className="text-xs font-medium opacity-70">
									({classDiff > 0 ? "+" : ""}
									{classDiff.toFixed(2)})
								</span>
							</div>
						</div>
					)}
				</div>
			</div>

			<div className="divide-y divide-backgroundTertiary">
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
