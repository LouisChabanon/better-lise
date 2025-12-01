"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
	CloudUploadOutlined,
	LoadingOutlined,
	EditOutlined,
	CheckOutlined,
	CloseOutlined,
	WarningOutlined,
	InfoCircleOutlined,
} from "@ant-design/icons";
import { submitWeightVote } from "@/actions/CommunityWeights";
import { RealGradeWithCoeff } from "@/lib/types";
import { parseClassCode } from "@/lib/utils/simulation-utils";

export default function RealGradeRow({
	grade,
	effectiveCoeff,
	onCoeffChange,
	onOverrideClass,
	onWeightSubmitSuccess,
}: {
	grade: RealGradeWithCoeff;
	effectiveCoeff: number;
	onCoeffChange: (val: number) => void;
	onOverrideClass: (newClass: string) => void;
	onWeightSubmitSuccess: (code: string, val: number) => void;
}) {
	const [isEditingClass, setIsEditingClass] = useState(false);
	const [tempClassName, setTempClassName] = useState("");
	const [submitting, setSubmitting] = useState(false);

	// Initialize temp class name from utils
	const currentClass = parseClassCode(grade.code).classCode;
	const hasChanged = effectiveCoeff !== grade.coeff;

	const handleVote = async () => {
		setSubmitting(true);
		const res = await submitWeightVote(grade.code, effectiveCoeff);
		setSubmitting(false);
		if (res.success) onWeightSubmitSuccess(grade.code, effectiveCoeff);
	};

	const handleSaveClass = () => {
		if (tempClassName.trim()) {
			onOverrideClass(tempClassName.trim());
			setIsEditingClass(false);
		}
	};

	return (
		<div className="p-3 pl-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-backgroundSecondary/30 transition-colors gap-3 group">
			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-2">
					<span className="font-medium text-sm truncate text-textPrimary">
						{grade.libelle}
					</span>
					{grade.isNew && (
						<span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
					)}
				</div>

				{/* --- Class Editing Section --- */}
				<div className="flex items-center gap-3 text-xs text-textTertiary mt-0.5">
					{isEditingClass ? (
						<div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2">
							<input
								autoFocus
								type="text"
								value={tempClassName}
								onChange={(e) => setTempClassName(e.target.value)}
								className="bg-backgroundSecondary border border-primary rounded px-1.5 py-0.5 text-textPrimary w-24 outline-none"
							/>
							<button
								onClick={handleSaveClass}
								className="text-green-600 hover:bg-green-100 p-1 rounded"
							>
								<CheckOutlined />
							</button>
							<button
								onClick={() => setIsEditingClass(false)}
								className="text-red-500 hover:bg-red-100 p-1 rounded"
							>
								<CloseOutlined />
							</button>
						</div>
					) : (
						<div
							className="flex items-center gap-2 group/edit cursor-pointer"
							onClick={() => {
								setTempClassName(currentClass);
								setIsEditingClass(true);
							}}
						>
							<span
								className={`font-mono ${
									currentClass === "Autre"
										? "text-orange-500 font-bold"
										: "opacity-50"
								}`}
							>
								{currentClass === "Autre" ? (
									<>
										<WarningOutlined /> Non classé
									</>
								) : (
									grade.code
								)}
							</span>
							<EditOutlined className="opacity-0 group-hover/edit:opacity-100 text-primary transition-opacity" />
							{currentClass === "Autre" && (
								<span className="text-[10px] text-orange-400">
									(Cliquez pour assigner)
								</span>
							)}
						</div>
					)}
				</div>
			</div>

			<div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
				<span className="text-base font-bold text-textPrimary bg-backgroundSecondary px-2 py-1 rounded-lg border border-backgroundTertiary min-w-[3rem] text-center">
					{grade.note}
				</span>

				<div className="flex flex-col items-end w-28 relative">
					<label className="text-[8px] text-textQuaternary uppercase font-bold mb-0.5 flex gap-1 items-center">
						Coeff
						{/* Tooltip for Community Weights */}
						{!grade.isCommunity && (
							<span className="group/info relative cursor-help">
								<InfoCircleOutlined className="text-primary" />
								<div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-textPrimary text-backgroundPrimary text-[10px] rounded shadow-lg hidden group-hover/info:block z-10 font-normal normal-case">
									Ce coefficient n'est pas encore vérifié par la communauté.
									Modifiez-le et envoyez-le !
								</div>
							</span>
						)}
					</label>
					<div className="flex items-center justify-end">
						<input
							type="number"
							min="0.1"
							step="0.1"
							className={`w-12 px-1 py-0.5 text-right text-sm font-bold rounded border outline-none transition-all
                ${
									grade.isCommunity
										? "text-primary border-primary/30 bg-primary/5"
										: "text-textSecondary border-backgroundTertiary bg-backgroundSecondary"
								}
                focus:ring-2 focus:ring-primary/20 focus:border-primary`}
							value={effectiveCoeff}
							onChange={(e) => onCoeffChange(parseFloat(e.target.value))}
						/>

						<AnimatePresence>
							{(hasChanged || submitting) && (
								<motion.button
									initial={{ scale: 0, opacity: 0 }}
									animate={{ scale: 1, opacity: 1 }}
									exit={{ scale: 0, opacity: 0 }}
									onClick={handleVote}
									disabled={submitting}
									className="ml-2 h-6 w-6 flex items-center justify-center rounded-full bg-primary text-white hover:bg-primary-600 shadow-md text-xs shrink-0"
									title="Partager ce coefficient avec la communauté"
								>
									{submitting ? <LoadingOutlined /> : <CloudUploadOutlined />}
								</motion.button>
							)}
						</AnimatePresence>
					</div>
				</div>
			</div>
		</div>
	);
}
