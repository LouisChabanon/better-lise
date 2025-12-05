"use client";

import { CalendarOutlined } from "@ant-design/icons";
import { GradeType } from "@/lib/types";
import { useGradeSimulation } from "@/hooks/useGradeSimulation";
import SimulationForm from "./SimulationForm";
import UECard from "./UECard";
import HelpBlock from "./HelpBlock";

export default function GradeSimulator({
	initialGrades,
}: {
	initialGrades: GradeType[];
}) {
	const {
		groupedData,
		availableSemesters,
		selectedSemester,
		setSelectedSemester,
		availableClasses,
		addSimulation,
		removeSimulation,
		updateSimulation,
		getEffectiveCoeff,
		handleLocalCoeffChange,
		handleClassOverride,
		onWeightSubmitSuccess,
	} = useGradeSimulation(initialGrades);

	return (
		<div className="flex flex-col gap-6 pb-24 max-w-4xl mx-auto w-full px-4 sm:px-6">
			{/* --- Controls --- */}
			<div className="top-0 z-30 bg-backgroundPrimary/95 backdrop-blur-xl py-3 -mx-4 px-4 sm:mx-0 sm:px-0 border-b border-backgroundTertiary sm:border-none sm:static">
				<div className="flex items-center justify-between gap-4">
					<h2 className="text-xl font-bold text-textPrimary hidden sm:block">
						Simulateur
					</h2>

					<div className="flex items-center bg-backgroundSecondary border border-backgroundTertiary rounded-xl px-3 py-2 gap-3 w-full sm:w-auto shadow-sm">
						<CalendarOutlined className="text-primary-400 text-lg shrink-0" />
						<select
							value={selectedSemester}
							onChange={(e) => setSelectedSemester(e.target.value)}
							className="bg-transparent text-sm text-textPrimary font-semibold outline-none cursor-pointer w-full"
						>
							{availableSemesters.map((s) => (
								<option key={s} value={s}>
									Semestre {s.replace("S", "")}
								</option>
							))}
							<option value="all">Tous les semestres</option>
						</select>
					</div>
				</div>
			</div>

			<HelpBlock />

			<SimulationForm classes={availableClasses} onAdd={addSimulation} />

			<div className="space-y-6">
				{Object.entries(groupedData)
					.sort()
					.map(([classCode, group]) => (
						<UECard
							key={classCode}
							group={group}
							getEffectiveCoeff={getEffectiveCoeff}
							onLocalCoeffChange={handleLocalCoeffChange}
							onClassOverride={handleClassOverride}
							onWeightSubmitSuccess={onWeightSubmitSuccess}
							onUpdateSim={updateSimulation}
							onDeleteSim={removeSimulation}
						/>
					))}

				{Object.keys(groupedData).length === 0 && (
					<div className="p-8 text-center text-textTertiary border-2 border-dashed border-backgroundTertiary rounded-3xl bg-backgroundSecondary/30">
						<p>Aucune note trouvée pour ce semestre.</p>
					</div>
				)}
			</div>
		</div>
	);
}
