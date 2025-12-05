"use client";

import { useState } from "react";
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
		<div className="p-3 sm:p-4 hover:bg-backgroundSecondary/30 transition-colors border-b border-backgroundTertiary last:border-0 group">
			{/* Top Row: Grade Info & Value */}
			<div className="flex justify-between items-start gap-3 mb-2 sm:mb-0 sm:items-center">
				{/* Name & New Indicator */}
				<div className="flex-1 min-w-0 pr-2">
					<div className="flex items-start gap-2">
						{grade.isNew && (
							<span className="mt-1.5 w-2 h-2 rounded-full bg-primary shrink-0 ring-2 ring-primary/20" />
						)}
						<span className="font-semibold text-sm text-textPrimary leading-tight break-words">
							{grade.libelle}
						</span>
					</div>

					{/* Class Code / Edit (Mobile Optimized) */}
					<div className="mt-1 text-xs text-textTertiary">
						{isEditingClass ? (
							<div className="flex items-center gap-2 mt-1 w-full max-w-[200px]">
								<input
									autoFocus
									type="text"
									value={tempClassName}
									onChange={(e) => setTempClassName(e.target.value)}
									className="flex-1 bg-backgroundSecondary border border-primary rounded px-2 py-1 text-textPrimary text-xs outline-none shadow-sm"
								/>
								<button
									onClick={handleSaveClass}
									className="bg-badgeSuccessBg text-badgeSuccessText p-1.5 rounded-md"
								>
									<CheckOutlined />
								</button>
								<button
									onClick={() => setIsEditingClass(false)}
									className="bg-badgeDangerBg text-badgeDangerText p-1.5 rounded-md"
								>
									<CloseOutlined />
								</button>
							</div>
						) : (
							<div
								className="flex items-center gap-1.5 cursor-pointer hover:text-primary transition-colors w-fit"
								onClick={() => {
									setTempClassName(currentClass);
									setIsEditingClass(true);
								}}
							>
								<span
									className={`font-mono uppercase tracking-wide ${
										currentClass === "Autre"
											? "text-badgeWarningText font-bold"
											: ""
									}`}
								>
									{currentClass === "Autre" ? "⚠️ Assigner UE" : grade.code}
								</span>
								<EditOutlined className="text-[10px] opacity-60" />
							</div>
						)}
					</div>
				</div>

				{/* Desktop coeff controls */}
				<div className="hidden sm:flex items-center shrink-0 gap-2">
					<div className="flex items-center text-xs text-textQuaternary font-bold uppercase">
						Coeff
					</div>
					<div className="flex flex-col items-end">
						<input
							type="number"
							min="0.01"
							step="0.1"
							className={`w-20 px-3 py-2 text-right text-sm font-bold rounded-lg border outline-none transition-all
                                ${
																	grade.isCommunity
																		? "text-primary border-primary/30 bg-primary/5"
																		: "text-textSecondary border-backgroundTertiary bg-backgroundSecondary"
																} focus:ring-2 focus:ring-primary/30 focus:border-primary`}
							value={effectiveCoeff}
							onChange={(e) => onCoeffChange(parseFloat(e.target.value))}
						/>
					</div>
					{/* Upload Button */}
					{(hasChanged || submitting) && (
						<div className="w-8 h-8 flex items-center justify-center">
							<button
								onClick={handleVote}
								disabled={submitting}
								className="h-9 w-9 flex items-center justify-center rounded-full bg-primary text-white hover:bg-primary-600 shadow-lg shadow-primary/30 text-sm active:scale-95 transition-transform"
							>
								{submitting ? <LoadingOutlined /> : <CloudUploadOutlined />}
							</button>
						</div>
					)}
				</div>

				{/* Grade Badge */}
				<div className="flex flex-col items-end shrink-0">
					<span
						className={`text-base font-bold px-3 py-1.5 rounded-xl border min-w-[3.5rem] text-center shadow-sm
                        ${
													Number(grade.note) >= 10
														? "bg-badgeSuccessBg text-badgeSuccessText border-badgeSuccessText/20"
														: "bg-badgeDangerBg text-badgeDangerText border-badgeDangerText/20"
												}`}
					>
						{grade.note}
					</span>
				</div>
			</div>

			{/* Bottom Row (Mobile): Controls & Coeff */}
			<div className="flex items-center justify-between mt-3 pt-2 border-t border-backgroundTertiary/40 sm:hidden">
				{/* Label only visible on mobile context usually, but styled for both */}
				<div className="flex items-center gap-2 text-xs text-textQuaternary font-bold uppercase sm:hidden">
					<InfoCircleOutlined /> Coeff
				</div>

				<div className="flex items-center gap-3">
					{/* Coeff Input */}
					<div className="flex flex-col items-end">
						<input
							type="number"
							min="0.01"
							step="0.1"
							className={`w-20 px-3 py-2 text-right text-sm font-bold rounded-lg border outline-none transition-all
                                ${
																	grade.isCommunity
																		? "text-primary border-primary/30 bg-primary/5"
																		: "text-textSecondary border-backgroundTertiary bg-backgroundSecondary"
																} focus:ring-2 focus:ring-primary/30 focus:border-primary`}
							value={effectiveCoeff}
							onChange={(e) => onCoeffChange(parseFloat(e.target.value))}
						/>
					</div>

					{/* Upload Button */}
					{(hasChanged || submitting) && (
						<div className="w-8 h-8 flex items-center justify-center">
							<button
								onClick={handleVote}
								disabled={submitting}
								className="h-9 w-9 flex items-center justify-center rounded-full bg-primary text-white hover:bg-primary-600 shadow-lg shadow-primary/30 text-sm active:scale-95 transition-transform sm:mt-4"
							>
								{submitting ? <LoadingOutlined /> : <CloudUploadOutlined />}
							</button>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
