"use client";

import { useState } from "react";
import { PlusOutlined, ExperimentOutlined } from "@ant-design/icons";
import { Button } from "@/components/ui/Button";
import { SimulatedGrade } from "@/lib/types";
import { m } from "framer-motion";

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
	const [isExpanded, setIsExpanded] = useState(false);

	const handleSubmit = () => {
		onAdd({
			id: Math.random().toString(36).substr(2, 9),
			name: newName || `Simu.`,
			grade: newGrade,
			coeff: newCoeff,
			classCode: selectedClass || "Autre",
		});
		setNewName("");

		setIsExpanded(false);
	};

	return (
		<div className="bg-backgroundPrimary border border-backgroundTertiary rounded-2xl p-5 shadow-sm mb-6 transition-all hover:shadow-md">
			<div
				className="flex items-center justify-between cursor-pointer md:cursor-default"
				onClick={() => setIsExpanded(!isExpanded)}
			>
				<h3 className="text-lg font-bold text-textPrimary flex items-center gap-2">
					<div className="p-2 bg-primary/10 rounded-lg text-primary">
						<ExperimentOutlined />
					</div>
					Nouvelle Simulation
				</h3>
				<span className="text-xs text-textTertiary md:hidden">
					{isExpanded ? "Masquer" : "Ouvrir"}
				</span>
			</div>

			<m.div
				initial={false}
				animate={{ height: isExpanded ? "auto" : "auto" }}
				className={`mt-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-end ${
					!isExpanded ? "hidden md:grid" : ""
				}`}
			>
				<div className="md:col-span-4 flex flex-col gap-1.5">
					<label className="text-xs font-bold text-textSecondary uppercase tracking-wider">
						UE / Matière
					</label>
					<div className="relative">
						<select
							value={selectedClass}
							onChange={(e) => setSelectedClass(e.target.value)}
							className="w-full bg-backgroundSecondary border border-backgroundTertiary rounded-xl px-4 pl-3 py-3 text-textPrimary text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
						>
							{classes.map((c) => (
								<option key={c} value={c}>
									{c}
								</option>
							))}
							<option value="Autre">Autre</option>
						</select>
						{/* Custom arrow could go here */}
					</div>
				</div>

				<div className="md:col-span-4 flex flex-col gap-1.5">
					<label className="text-xs font-bold text-textSecondary uppercase tracking-wider">
						Nom
					</label>
					<input
						type="text"
						value={newName}
						onChange={(e) => setNewName(e.target.value)}
						placeholder="Ex: Rattrapage..."
						className="w-full bg-backgroundSecondary border border-backgroundTertiary rounded-xl px-4 py-3 text-textPrimary text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-textQuaternary"
					/>
				</div>

				<div className="grid grid-cols-2 gap-4 md:col-span-4 md:flex md:items-end">
					<div className="flex flex-col gap-1.5 flex-1">
						<label className="text-xs font-bold text-textSecondary uppercase tracking-wider">
							Coeff.
						</label>
						<input
							type="number"
							min="0.1"
							step="0.1"
							value={newCoeff}
							onChange={(e) => setNewCoeff(parseFloat(e.target.value))}
							className="w-full bg-backgroundSecondary border border-backgroundTertiary rounded-xl px-3 py-3 text-textPrimary text-sm font-bold text-center outline-none focus:ring-2 focus:ring-primary/20 transition-all"
						/>
					</div>
					<div className="flex flex-col gap-1.5 flex-1">
						<label className="text-xs font-bold text-textSecondary uppercase tracking-wider">
							Note
						</label>
						<input
							type="number"
							min="0"
							max="20"
							step="0.1"
							value={newGrade}
							onChange={(e) => setNewGrade(parseFloat(e.target.value))}
							className="w-full bg-backgroundSecondary border border-backgroundTertiary rounded-xl px-3 py-3 text-textPrimary text-sm font-bold text-center outline-none focus:ring-2 focus:ring-primary/20 transition-all"
						/>
					</div>
				</div>

				<div className="md:col-span-12 mt-2">
					<Button
						onClick={handleSubmit}
						status="primary"
						className="w-full h-12 md:h-10 text-base md:text-sm font-bold shadow-md hover:shadow-lg transition-all"
					>
						<PlusOutlined /> Ajouter la note simulée
					</Button>
				</div>
			</m.div>
		</div>
	);
}
