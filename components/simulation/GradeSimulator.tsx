"use client";

import { CalendarOutlined, CalculatorOutlined } from "@ant-design/icons";
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
		<div className="flex flex-col gap-4 pb-20 max-w-4xl mx-auto w-full px-2 sm:px-0">
			{/* --- Top Controls --- */}
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2 sticky top-0 z-20 bg-backgroundPrimary/95 backdrop-blur-sm p-2 -mx-2 sm:mx-0 rounded-b-xl border-b border-backgroundTertiary/50 sm:border-0 sm:static transition-colors duration-300">
				<h2 className="text-xl font-bold text-textPrimary px-2">Simulateur</h2>

				<div className="flex items-center bg-backgroundSecondary border border-backgroundTertiary rounded-xl px-4 py-2 gap-3 shadow-sm w-full sm:w-auto transition-colors duration-300">
					<CalendarOutlined className="text-primary-400 text-lg" />
					<select
						value={selectedSemester}
						onChange={(e) => setSelectedSemester(e.target.value)}
						className="bg-backgroundSecondary text-sm text-textPrimary font-semibold outline-none cursor-pointer w-full"
					>
						{availableSemesters.map((s) => (
							<option
								key={s}
								value={s}
								className="bg-backgroundPrimary text-textPrimary"
							>
								Semestre {s.replace("S", "")}
							</option>
						))}
						<option
							value="all"
							className="bg-backgroundPrimary text-textPrimary"
						>
							Tous les semestres
						</option>
					</select>
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
					<div className="p-12 text-center text-textTertiary border-2 border-dashed border-backgroundTertiary rounded-3xl bg-backgroundSecondary/30 flex flex-col items-center justify-center min-h-[300px] transition-colors duration-300">
						<div className="w-20 h-20 bg-primary-50 rounded-full flex items-center justify-center mb-6">
							<CalculatorOutlined className="text-4xl text-primary-400 opacity-80" />
						</div>
						<h3 className="text-lg font-bold text-textPrimary mb-2">
							C'est bien vide ici
						</h3>
						<p className="max-w-xs mx-auto text-textSecondary">
							Aucune note trouvée pour ce semestre. Essayez d'en sélectionner un
							autre ou ajoutez une simulation.
						</p>
					</div>
				)}
			</div>
		</div>
	);
}
