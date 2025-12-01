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
		<div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-backgroundSecondary/30 transition-colors gap-3 group border-b border-backgroundTertiary last:border-0">
			{/* Left Section: Name & Class Edit */}
			<div className="flex-1 min-w-0 flex flex-col justify-center">
				<div className="flex items-start gap-2 mb-1">
					{grade.isNew && (
						<span className="mt-1.5 w-2 h-2 rounded-full bg-primary shrink-0 ring-2 ring-primary/20" />
					)}
					<span className="font-semibold text-sm text-textPrimary leading-tight break-words">
						{grade.libelle}
					</span>
				</div>

				{/* Mobile-Friendly Edit Area */}
				<div className="flex items-center gap-3 text-xs text-textTertiary h-6">
					{isEditingClass ? (
						<div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 w-full max-w-[200px]">
							<input
								autoFocus
								type="text"
								value={tempClassName}
								onChange={(e) => setTempClassName(e.target.value)}
								className="flex-1 bg-backgroundSecondary border border-primary rounded px-2 py-1 text-textPrimary text-xs outline-none shadow-sm"
							/>
							<button
								onClick={handleSaveClass}
								className="bg-badgeSuccessBg text-badgeSuccessText hover:opacity-80 p-1 rounded-md transition-all"
							>
								<CheckOutlined />
							</button>
							<button
								onClick={() => setIsEditingClass(false)}
								className="bg-badgeDangerBg text-badgeDangerText hover:opacity-80 p-1 rounded-md transition-all"
							>
								<CloseOutlined />
							</button>
						</div>
					) : (
						<div
							className="flex items-center gap-1.5 group/edit cursor-pointer hover:bg-backgroundSecondary/50 px-1.5 py-0.5 -ml-1.5 rounded transition-colors"
							onClick={() => {
								setTempClassName(currentClass);
								setIsEditingClass(true);
							}}
						>
							<span
								className={`font-mono text-[10px] sm:text-xs uppercase tracking-wide ${
									currentClass === "Autre"
										? "text-badgeWarningText font-bold flex items-center gap-1"
										: "opacity-60"
								}`}
							>
								{currentClass === "Autre" ? (
									<>
										<WarningOutlined /> Assigner une UE
									</>
								) : (
									grade.code
								)}
							</span>
							<EditOutlined className="text-[10px] opacity-40 group-hover/edit:opacity-100 text-primary transition-opacity" />
						</div>
					)}
				</div>
			</div>

			{/* Right Section: Grade & Coeff Controls */}
			<div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto mt-2 sm:mt-0 bg-backgroundSecondary/20 sm:bg-transparent p-2 sm:p-0 rounded-lg">
				{/* Grade Badge */}
				<div className="flex flex-col items-end">
					{/* Label visible on desktop to match Coeff label height */}
					<label className="text-[9px] text-textQuaternary uppercase font-bold mb-0.5 hidden sm:block">
						Note
					</label>
					<div className="flex items-center gap-2">
						<span className="text-xs font-bold text-textQuaternary uppercase sm:hidden">
							Note:
						</span>
						<span
							className={`text-base font-bold px-3 py-1 rounded-lg border min-w-[3.5rem] text-center shadow-sm
                ${
									Number(grade.note) >= 10
										? "bg-badgeSuccessBg text-badgeSuccessText border-badgeSuccessText/20"
										: "bg-badgeDangerBg text-badgeDangerText border-badgeDangerText/20"
								}
            `}
						>
							{grade.note}
						</span>
					</div>
				</div>

				<div className="h-6 w-px bg-backgroundTertiary mx-2 hidden sm:block mt-3"></div>

				{/* Coeff Control */}
				<div className="flex items-center gap-2">
					<div className="flex flex-col items-end">
						<label className="text-[9px] text-textQuaternary uppercase font-bold mb-0.5 flex gap-1 items-center">
							Coeff
							{!grade.isCommunity && (
								<span className="hidden sm:inline group/info relative cursor-help">
									<InfoCircleOutlined className="text-primary/70" />
								</span>
							)}
						</label>
						<div className="flex items-center relative">
							<input
								type="number"
								min="0.1"
								step="0.1"
								className={`w-14 px-2 py-1.5 text-right text-sm font-bold rounded-lg border outline-none transition-all
                    ${
											grade.isCommunity
												? "text-primary border-primary/30 bg-primary/5 ring-1 ring-primary/10"
												: "text-textSecondary border-backgroundTertiary bg-backgroundSecondary"
										}
                    focus:ring-2 focus:ring-primary/30 focus:border-primary`}
								value={effectiveCoeff}
								onChange={(e) => onCoeffChange(parseFloat(e.target.value))}
							/>
						</div>
					</div>

					{/* Upload Button */}
					<div className="w-8 h-8 flex items-center justify-center">
						<AnimatePresence>
							{(hasChanged || submitting) && (
								<motion.button
									initial={{ scale: 0.5, opacity: 0 }}
									animate={{ scale: 1, opacity: 1 }}
									exit={{ scale: 0.5, opacity: 0 }}
									onClick={handleVote}
									disabled={submitting}
									className="h-8 w-8 mt-4 flex items-center justify-center rounded-full bg-primary text-white hover:bg-primary-600 shadow-lg shadow-primary/30 text-sm active:scale-95 transition-transform"
									title="Partager"
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
