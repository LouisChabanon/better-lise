"use client";

import { CalendarOutlined, CalculatorOutlined } from "@ant-design/icons";
import { GradeType } from "@/lib/types";
import { useGradeSimulation } from "@/hooks/useGradeSimulation";
import SimulationForm from "./SimulationForm";
import ClassCard from "./UECard";
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
		<div className="flex flex-col gap-6 pb-12">
			{/* --- Semester Selector --- */}
			<div className="flex items-center gap-2 px-1 justify-end">
				<div className="flex items-center bg-backgroundTertiary border border-backgroundTertiary rounded-lg px-3 py-1.5 gap-2 shadow-sm">
					<CalendarOutlined className="text-primary" />
					<select
						value={selectedSemester}
						onChange={(e) => setSelectedSemester(e.target.value)}
						className="bg-backgroundTertiary text-sm font-bold text-textPrimary outline-none cursor-pointer"
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

			<HelpBlock />

			<SimulationForm classes={availableClasses} onAdd={addSimulation} />

			<div className="space-y-6">
				{Object.entries(groupedData)
					.sort()
					.map(([classCode, group]) => (
						<ClassCard
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
					<div className="p-12 text-center text-textTertiary border-2 border-dashed border-backgroundTertiary rounded-2xl">
						<CalculatorOutlined className="text-4xl mb-4 opacity-20" />
						<p>Aucune note trouvée pour le semestre sélectionné.</p>
					</div>
				)}
			</div>
		</div>
	);
}
