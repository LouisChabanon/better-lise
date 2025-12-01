"use client";

import { useState } from "react";
import { PlusOutlined, ExperimentOutlined } from "@ant-design/icons";
import { Button } from "@/components/ui/Button";
import { SimulatedGrade } from "@/lib/types";

export default function SimulationForm({
	classes,
	onAdd,
}: {
	classes: string[];
	onAdd: (s: SimulatedGrade) => void;
}) {
	const [newName, setNewName] = useState("");
	const [newGrade, setNewGrade] = useState(10);
	const [newCoeff, setNewCoeff] = useState(1);
	const [selectedClass, setSelectedClass] = useState(classes[0] || "");

	const handleSubmit = () => {
		onAdd({
			id: Math.random().toString(36).substr(2, 9),
			name: newName || `Simu.`,
			grade: newGrade,
			coeff: newCoeff,
			classCode: selectedClass || "Autre",
		});
		setNewName("");
	};

	return (
		<div className="bg-backgroundPrimary border border-backgroundTertiary rounded-2xl p-6 shadow-sm mb-6">
			<h3 className="text-lg font-bold text-textPrimary mb-6 flex items-center gap-2">
				<ExperimentOutlined /> Nouvelle Simulation
			</h3>
			<div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
				<div className="md:col-span-3 flex flex-col gap-2">
					<label className="text-xs font-bold text-textSecondary uppercase">
						UE / Matière
					</label>
					<select
						value={selectedClass}
						onChange={(e) => setSelectedClass(e.target.value)}
						className="w-full bg-backgroundSecondary border border-backgroundTertiary rounded-xl px-4 py-2 text-textPrimary h-[42px] outline-none"
					>
						{classes.map((c) => (
							<option key={c} value={c}>
								{c}
							</option>
						))}
						<option value="Autre">Autre</option>
					</select>
				</div>
				<div className="md:col-span-3 flex flex-col gap-2">
					<label className="text-xs font-bold text-textSecondary uppercase">
						Nom
					</label>
					<input
						type="text"
						value={newName}
						onChange={(e) => setNewName(e.target.value)}
						placeholder="Ex: Rattrapage"
						className="w-full bg-backgroundSecondary border border-backgroundTertiary rounded-xl px-4 py-2 text-textPrimary h-[42px] outline-none"
					/>
				</div>
				<div className="md:col-span-2 flex flex-col gap-2">
					<label className="text-xs font-bold text-textSecondary uppercase">
						Coeff.
					</label>
					<input
						type="number"
						min="0.1"
						step="0.1"
						value={newCoeff}
						onChange={(e) => setNewCoeff(parseFloat(e.target.value))}
						className="w-full bg-backgroundSecondary border border-backgroundTertiary rounded-xl px-4 py-2 text-textPrimary h-[42px] outline-none"
					/>
				</div>
				<div className="md:col-span-2 flex flex-col gap-2">
					<label className="text-xs font-bold text-textSecondary uppercase">
						Note
					</label>
					<input
						type="number"
						min="0"
						max="20"
						step="0.1"
						value={newGrade}
						onChange={(e) => setNewGrade(parseFloat(e.target.value))}
						className="w-full bg-backgroundSecondary border border-backgroundTertiary rounded-xl px-4 py-2 text-textPrimary h-[42px] outline-none"
					/>
				</div>
				<div className="md:col-span-2">
					<Button onClick={handleSubmit} status="primary" className="w-full">
						<PlusOutlined /> Ajouter
					</Button>
				</div>
			</div>
		</div>
	);
}
