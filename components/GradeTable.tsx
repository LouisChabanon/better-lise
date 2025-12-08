"use client";
import React, { useEffect, useState, useMemo } from "react";
import { Button } from "./ui/Button";
import { GradeType } from "@/lib/types";
import {
	CaretRightFilled,
	CaretLeftFilled,
	CaretUpFilled,
	CaretDownFilled,
	ReloadOutlined,
	CalendarOutlined,
	BarcodeOutlined,
	CheckOutlined,
	FilterOutlined,
	UserOutlined,
	CloseOutlined,
	AppstoreOutlined,
} from "@ant-design/icons";
import GradeModal from "./ui/GradeModal";
import posthog from "posthog-js";
import GradeLootBoxModal from "./ui/GradeLootBoxModal";
import { useGradesData } from "@/hooks/useGradesData";
import { useScraperLoading } from "@/hooks/useScraperLoading";
import {
	markGradeAsOpened,
	markAllGradesAsOpened,
	markGradeAsNew,
} from "@/actions/MarkGradeOpened";

interface GradeTableProps {
	session: any;
	gambling: boolean;
}

type SortConfig = {
	key: keyof GradeType;
	direction: "asc" | "desc";
};

// --- Helper Functions ---

// Extract Semester (e.g., "S7" from "FITE_S7_EEAA...")
const getSemesterFromCode = (code: string) => {
	const parts = code.split("_");
	const semester = parts.find((p) => /^S\d+$/.test(p));
	return semester || "Autre";
};

// Extract Assignment (e.g., "EEAA" from "FITE_S7_EEAA...")
// Assuming standard format: UNIT_SEMESTER_ASSIGNMENT_DETAILS
const getAssignmentFromCode = (code: string) => {
	const parts = code.split("_");
	return parts.length > 2 ? parts[2] : "Autre";
};

export function GradeTable({ session, gambling }: GradeTableProps) {
	const {
		data: grades,
		isLoading,
		isFetching,
		isError,
		error,
		refetch,
	} = useGradesData(session);

	const { progress, message } = useScraperLoading(isFetching || isLoading);

	// --- State ---
	const [localGrades, setLocalGrades] = useState<GradeType[]>([]);
	const [currentPage, setCurrentPage] = useState(1);
	const [searchTerm, setSearchTerm] = useState("");
	const [isFiltersOpen, setIsFiltersOpen] = useState(false); // Toggle for mobile/desktop filter panel

	// Filtering State
	const [selectedSemester, setSelectedSemester] = useState<string>("all");
	const [selectedAssignment, setSelectedAssignment] = useState<string>("all");
	const [selectedTeacher, setSelectedTeacher] = useState<string>("all");

	// Sorting State
	const [sortConfig, setSortConfig] = useState<SortConfig>({
		key: "date",
		direction: "desc",
	});

	// Modals
	const [selectedGrade, setSelectedGrade] = useState<GradeType | null>(null);
	const [gradeToReveal, setGradeToReveal] = useState<GradeType | null>(null);

	const hasNewGrades = localGrades.some((g) => g.isNew);
	const isFilterActive =
		selectedSemester !== "all" ||
		selectedAssignment !== "all" ||
		selectedTeacher !== "all";

	function noteBadgeClass(note: number | string) {
		const n = Number(note);
		if (isNaN(n)) return "bg-badgeNeutralBg text-badgeNeutralText";
		if (n < 10) return "bg-badgeDangerBg text-badgeDangerText";
		if (n >= 10 && n < 12) return "bg-badgeWarningBg text-badgeWarningText";
		return "bg-badgeSuccessBg text-badgeSuccessText";
	}

	// --- Effects ---
	useEffect(() => {
		if (grades) {
			setLocalGrades(grades);
		}
	}, [grades]);

	const uniqueSemesters = useMemo(() => {
		if (!localGrades) return [];
		const set = new Set(localGrades.map((g) => getSemesterFromCode(g.code)));
		return Array.from(set).sort();
	}, [localGrades]);

	const uniqueAssignments = useMemo(() => {
		if (!localGrades) return [];
		const set = new Set(localGrades.map((g) => getAssignmentFromCode(g.code)));
		return Array.from(set).sort();
	}, [localGrades]);

	const uniqueTeachers = useMemo(() => {
		if (!localGrades) return [];
		const teacherSet = new Set<string>();

		localGrades.forEach((g) => {
			const splitTeachers = g.teachers.split(",").map((t) => t.trim());
			splitTeachers.forEach((t) => {
				if (t.length > 0) teacherSet.add(t);
			});
		});
		return Array.from(teacherSet).sort();
	}, [localGrades]);

	// --- Filtering & Sorting Logic ---
	const processedGrades = useMemo(() => {
		if (!localGrades) return [];

		let result = [...localGrades];

		// 1. Search
		if (searchTerm) {
			const term = searchTerm.trim().toLowerCase();
			result = result.filter(
				(g) =>
					g.code.toLowerCase().includes(term) ||
					g.note.toString().includes(term) ||
					g.date.includes(term) ||
					g.libelle.toLowerCase().includes(term)
			);
		}

		// 2. Semester Filter
		if (selectedSemester !== "all") {
			result = result.filter(
				(g) => getSemesterFromCode(g.code) === selectedSemester
			);
		}

		// 3. Assignment Filter
		if (selectedAssignment !== "all") {
			result = result.filter(
				(g) => getAssignmentFromCode(g.code) === selectedAssignment
			);
		}

		// 4. Teacher Filter
		if (selectedTeacher !== "all") {
			result = result.filter((g) => g.teachers === selectedTeacher);
		}

		// 5. Sorting
		result.sort((a, b) => {
			// New grades are always on top
			if (a.isNew && !b.isNew) return -1;
			if (!a.isNew && b.isNew) return 1;

			let aValue: any = a[sortConfig.key];
			let bValue: any = b[sortConfig.key];

			// Date handling
			if (sortConfig.key === "date") {
				const [dA, mA, yA] = a.date.split("/").map(Number);
				const [dB, mB, yB] = b.date.split("/").map(Number);
				aValue = new Date(yA, mA - 1, dA).getTime();
				bValue = new Date(yB, mB - 1, dB).getTime();
			}
			// String handling
			else if (typeof aValue === "string") {
				aValue = aValue.toLowerCase();
				bValue = bValue.toLowerCase();
			}

			if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
			if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
			return 0;
		});

		return result;
	}, [
		localGrades,
		searchTerm,
		selectedSemester,
		selectedAssignment,
		selectedTeacher,
		sortConfig,
	]);

	// Reset pagination on filter change
	useEffect(() => {
		setCurrentPage(1);
	}, [searchTerm, selectedSemester, selectedAssignment, selectedTeacher]);

	// --- Handlers ---
	const markAsOpenedLocally = (code: string) => {
		setLocalGrades((prev) =>
			prev.map((g) => (g.code === code ? { ...g, isNew: false } : g))
		);
	};

	const handleMarkAllRead = () => {
		setLocalGrades((prev) => prev.map((g) => ({ ...g, isNew: false })));
		markAllGradesAsOpened();
	};

	const handleMarkAsNew = (grade: GradeType) => {
		setLocalGrades((prev) =>
			prev.map((g) => (g.code === grade.code ? { ...g, isNew: true } : g))
		);
		setSelectedGrade(null);
		markGradeAsNew(grade.code);
	};

	const handleSort = (key: keyof GradeType) => {
		setSortConfig((current) => ({
			key,
			direction:
				current.key === key && current.direction === "desc" ? "asc" : "desc",
		}));
	};

	const clearFilters = () => {
		setSelectedSemester("all");
		setSelectedAssignment("all");
		setSelectedTeacher("all");
		setSearchTerm("");
	};

	// --- Pagination Calculation ---
	const pageSize = 15;
	const totalPages = Math.max(1, Math.ceil(processedGrades.length / pageSize));
	const startIndex = (currentPage - 1) * pageSize;
	const currentGrades = processedGrades.slice(
		startIndex,
		startIndex + pageSize
	);

	// --- Modal Handlers ---
	const onRowClick = (grade: GradeType) => {
		const noteAsNumber = Number(grade.note);

		if (grade.isNew && !isNaN(noteAsNumber) && gambling) {
			setGradeToReveal(grade);
			setSelectedGrade(null);
		} else {
			if (posthog.has_opted_in_capturing()) {
				posthog.capture("view_grade_detail_event", { grade_code: grade.code });
			}
			setSelectedGrade(grade);
			setGradeToReveal(null);
		}

		if (grade.isNew) {
			markAsOpenedLocally(grade.code);
			markGradeAsOpened(grade.code);
		}
	};

	const handleRevealComplete = () => {
		if (!gradeToReveal) return;
		markAsOpenedLocally(gradeToReveal.code);
		markGradeAsOpened(gradeToReveal.code);
		const revealedGrade = { ...gradeToReveal, isNew: false };
		setGradeToReveal(null);
		setSelectedGrade(revealedGrade);
	};

	// --- Components ---
	const renderGradeBadge = (g: GradeType) => {
		const isRevealabale = g.isNew && !isNaN(Number(g.note)) && gambling;
		const noteClass = isRevealabale
			? "bg-buttonPrimaryBackground text-buttonTextPrimary font-extrabold border-2 border-primary-50"
			: noteBadgeClass(g.note);
		const noteText = isRevealabale ? "?" : g.note;

		return (
			<span
				className={`inline-flex items-center justify-center h-10 w-14 rounded-xl text-sm font-bold shrink-0 ${noteClass}`}
			>
				{noteText}
			</span>
		);
	};

	const SortIcon = ({ columnKey }: { columnKey: keyof GradeType }) => {
		if (sortConfig.key !== columnKey)
			return (
				<div className="opacity-50">
					<FilterOutlined />
				</div>
			);
		return sortConfig.direction === "asc" ? (
			<CaretUpFilled />
		) : (
			<CaretDownFilled />
		);
	};

	return (
		<div className="flex flex-col w-full relative md:h-full md:overflow-hidden">
			{/* ==================== HEADER & CONTROLS ==================== */}
			<div className="flex flex-col gap-3 mb-4 shrink-0 relative z-20">
				{/* Top Bar: Search, Filter Toggle, Refresh */}
				<div className="flex flex-row gap-2 items-center">
					<input
						type="text"
						placeholder="Rechercher..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						disabled={isFetching}
						className="px-4 py-2 border border-buttonSecondaryBorder bg-backgroundSecondary rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
					/>

					{/* Filter Toggle Button */}
					<Button
						status={isFiltersOpen || isFilterActive ? "primary" : "secondary"}
						onClick={() => setIsFiltersOpen(!isFiltersOpen)}
						className={`shrink-0 !px-3 ${
							isFilterActive && !isFiltersOpen ? "ring-2 ring-primary/30" : ""
						}`}
					>
						{isFiltersOpen ? <CloseOutlined /> : <FilterOutlined />}
					</Button>

					<Button
						status="primary"
						onClick={() => {
							refetch();
							if (posthog.has_opted_in_capturing())
								posthog.capture("grades_refresh");
						}}
						disabled={isFetching}
						className="shrink-0 !px-3"
					>
						<ReloadOutlined spin={isFetching} />
					</Button>
				</div>

				{/* ==================== COLLAPSIBLE FILTER PANEL ==================== */}
				{isFiltersOpen && (
					<div className="bg-backgroundPrimary border border-buttonSecondaryBorder rounded-xl p-4 shadow-lg animate-in slide-in-from-top-2 fade-in duration-200">
						<div className="flex justify-between items-center mb-3">
							<h3 className="text-sm font-semibold text-textPrimary flex items-center gap-2">
								<AppstoreOutlined /> Filtres & Tris
							</h3>
							{isFilterActive && (
								<button
									onClick={clearFilters}
									className="text-xs text-primary hover:underline"
								>
									Réinitialiser
								</button>
							)}
						</div>

						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
							{/* Semester Select */}
							<div className="flex flex-col gap-1">
								<label className="text-[10px] uppercase font-bold text-textTertiary">
									Semestre
								</label>
								<select
									className="px-3 py-2 border border-buttonSecondaryBorder bg-backgroundSecondary rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
									value={selectedSemester}
									onChange={(e) => setSelectedSemester(e.target.value)}
								>
									<option value="all">Tous</option>
									{uniqueSemesters.map((s) => (
										<option key={s} value={s}>
											{s}
										</option>
									))}
								</select>
							</div>

							{/* Assignment/Course Select */}
							<div className="flex flex-col gap-1">
								<label className="text-[10px] uppercase font-bold text-textTertiary">
									Matière
								</label>
								<select
									className="px-3 py-2 border border-buttonSecondaryBorder bg-backgroundSecondary rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
									value={selectedAssignment}
									onChange={(e) => setSelectedAssignment(e.target.value)}
								>
									<option value="all">Toutes</option>
									{uniqueAssignments.map((a) => (
										<option key={a} value={a}>
											{a}
										</option>
									))}
								</select>
							</div>

							{/* Teacher Select */}
							<div className="flex flex-col gap-1">
								<label className="text-[10px] uppercase font-bold text-textTertiary">
									Enseignant
								</label>
								<select
									className="px-3 py-2 border border-buttonSecondaryBorder bg-backgroundSecondary rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
									value={selectedTeacher}
									onChange={(e) => setSelectedTeacher(e.target.value)}
								>
									<option value="all">Tous</option>
									{uniqueTeachers.map((t) => (
										<option key={t} value={t}>
											{t}
										</option>
									))}
								</select>
							</div>

							{/* Mobile Sort (Only visible on small screens inside the panel) */}
							<div className="flex flex-col gap-1 sm:hidden">
								<label className="text-[10px] uppercase font-bold text-textTertiary">
									Trier par
								</label>
								<select
									className="px-3 py-2 border border-buttonSecondaryBorder bg-backgroundSecondary rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
									value={`${sortConfig.key}-${sortConfig.direction}`}
									onChange={(e) => {
										const [key, dir] = e.target.value.split("-");
										setSortConfig({
											key: key as keyof GradeType,
											direction: dir as "asc" | "desc",
										});
									}}
								>
									<option value="date-desc">Date (Récent)</option>
									<option value="date-asc">Date (Ancien)</option>
									<option value="note-desc">Note (Haut)</option>
									<option value="note-asc">Note (Bas)</option>
									<option value="libelle-asc">Nom (A-Z)</option>
								</select>
							</div>
						</div>

						{/* Mark Read Button (Mobile Panel Location) */}
						{hasNewGrades && (
							<div className="mt-4 pt-3 border-t border-border/50 flex justify-end">
								<Button
									status="secondary"
									onClick={handleMarkAllRead}
									className="w-full sm:w-auto"
								>
									<CheckOutlined /> Tout marquer comme vu
								</Button>
							</div>
						)}
					</div>
				)}
			</div>

			{/* ==================== MAIN CONTENT ==================== */}
			{isFetching ? (
				<div className="w-full flex flex-col items-center justify-center py-12 space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
					<div className="flex items-center justify-between w-full max-w-md px-1">
						<span className="text-xs font-bold text-textPrimary uppercase tracking-wider animate-pulse">
							{message}
						</span>
						<span className="text-xs font-mono text-textTertiary">
							{Math.round(progress)}%
						</span>
					</div>
					<div className="w-full max-w-md h-2 bg-backgroundSecondary border border-buttonSecondaryBorder rounded-full overflow-hidden shadow-inner relative">
						<div
							className="absolute top-0 left-0 h-full bg-primary transition-all duration-300 ease-out shadow-[0_0_10px] shadow-primary/50"
							style={{ width: `${progress}%` }}
						/>
						<div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
					</div>
					<p className="text-[10px] text-textTertiary max-w-xs text-center pt-2">
						En attente de Lise. C'est long...
					</p>
				</div>
			) : isError ? (
				<div className="text-center text-error p-8 bg-error/5 rounded-xl border border-error/10">
					Erreur: {(error as Error).message}
				</div>
			) : (
				<>
					<div className="flex-1 min-h-0 flex flex-col">
						{processedGrades.length === 0 ? (
							<div className="text-center text-textTertiary py-12 bg-backgroundPrimary rounded-xl border border-backgroundSecondary">
								Aucune note trouvée.
							</div>
						) : (
							<>
								{/* ================= MOBILE VIEW: CARD LIST (< md) ================= */}
								<div className="md:hidden space-y-3 pb-2">
									{currentGrades.map((g) => (
										<div
											key={g.code}
											onClick={() => onRowClick(g)}
											className={`
                        relative flex items-center justify-between p-4 rounded-2xl border border-backgroundSecondary bg-backgroundPrimary 
                        active:scale-[0.98] transition-transform touch-manipulation shadow-sm
                        ${
													g.isNew
														? "ring-2 ring-primary ring-offset-1 ring-offset-primary-500"
														: ""
												}
                      `}
										>
											{/* Left Side: Info */}
											<div className="flex-1 pr-4 min-w-0">
												<div className="flex items-center gap-2 mb-1">
													{g.isNew && (
														<span className="text-[10px] bg-primary text-white px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wide">
															New
														</span>
													)}
													<h3
														className="font-semibold text-textPrimary text-sm truncate w-full"
														title={g.libelle}
													>
														{g.libelle}
													</h3>
												</div>
												<div className="flex flex-col gap-1 text-xs text-textTertiary">
													<span className="flex items-center gap-1">
														<CalendarOutlined /> {g.date}
													</span>
													<span className="flex items-center gap-1 truncate text-textTertiary">
														<BarcodeOutlined /> {g.code}
													</span>
													{g.teachers && (
														<span className="flex items-center gap-1 truncate text-textTertiary">
															<UserOutlined /> {g.teachers}
														</span>
													)}
												</div>
											</div>

											{/* Right Side: Grade */}
											<div className="shrink-0">{renderGradeBadge(g)}</div>
										</div>
									))}
								</div>

								{/* ================= DESKTOP VIEW: TABLE (>= md) ================= */}
								<div className="hidden md:block flex-1 overflow-auto rounded-t-lg bg-backgroundPrimary border border-backgroundSecondary">
									<table className="table-fixed min-w-full text-sm divide-y divide-gray-200">
										<thead className="bg-backgroundTertiary uppercase text-xs font-semibold z-10 sticky top-0">
											<tr>
												<th
													className="px-4 py-3 text-left w-1/3 cursor-pointer hover:bg-backgroundSecondary/80 group select-none"
													onClick={() => handleSort("libelle")}
												>
													<div className="flex items-center gap-2">
														Libellé <SortIcon columnKey="libelle" />
													</div>
												</th>
												<th
													className="px-4 py-3 text-left w-24 cursor-pointer hover:bg-backgroundSecondary/80 group select-none"
													onClick={() => handleSort("note")}
												>
													<div className="flex items-center gap-2">
														Note <SortIcon columnKey="note" />
													</div>
												</th>
												<th
													className="px-4 py-3 text-left w-32 cursor-pointer hover:bg-backgroundSecondary/80 group select-none"
													onClick={() => handleSort("date")}
												>
													<div className="flex items-center gap-2">
														Date <SortIcon columnKey="date" />
													</div>
												</th>
												<th
													className="px-4 py-3 text-left w-32 cursor-pointer hover:bg-backgroundSecondary/80 group select-none"
													onClick={() => handleSort("code")}
												>
													<div className="flex items-center gap-2">
														Code <SortIcon columnKey="code" />
													</div>
												</th>
												<th
													className="px-4 py-3 text-left w-40 cursor-pointer hover:bg-backgroundSecondary/80 group select-none"
													onClick={() => handleSort("teachers")}
												>
													<div className="flex items-center gap-2">
														Enseignant <SortIcon columnKey="teachers" />
													</div>
												</th>
											</tr>
										</thead>
										<tbody className="text-textSecondary divide-y divide-calendarGridBorder">
											{currentGrades.map((g) => {
												const rowBg = g.isNew
													? "bg-primary/5"
													: "hover:bg-backgroundSecondary";

												return (
													<tr
														key={g.code}
														onClick={() => onRowClick(g)}
														className={`${rowBg} transition-colors cursor-pointer`}
													>
														<td
															className="px-4 py-3 align-middle truncate"
															title={g.libelle}
														>
															{g.isNew && (
																<span className="inline-block bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded mr-2">
																	NEW
																</span>
															)}
															{g.libelle}
														</td>
														<td className="px-4 py-3 font-semibold">
															{renderGradeBadge(g)}
														</td>
														<td className="px-4 py-3 text-textTertiary">
															{g.date}
														</td>
														<td className="px-4 py-3 text-textTertiary text-xs font-mono">
															{g.code}
														</td>
														<td
															className="px-4 py-3 text-textTertiary text-xs truncate"
															title={g.teachers}
														>
															{g.teachers}
														</td>
													</tr>
												);
											})}
										</tbody>
									</table>
								</div>
							</>
						)}
					</div>

					{/* --- Pagination --- */}
					<div
						className="
            hidden md:flex
            mt-4 md:mt-0
            md:sticky md:bottom-0 md:z-40
            justify-between items-center 
            md:p-4 md:bg-backgroundPrimary md:border-t md:border-buttonSecondaryBorder md:shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]
          "
					>
						<Button
							onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
							disabled={currentPage === 1}
							status="secondary"
						>
							<CaretLeftFilled />
						</Button>
						<span className="text-sm text-textTertiary font-medium">
							Page {currentPage} / {totalPages}
						</span>
						<Button
							onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
							disabled={currentPage === totalPages}
							status="secondary"
						>
							<CaretRightFilled />
						</Button>
					</div>

					{/* --- Modals --- */}
					{selectedGrade && (
						<GradeModal
							grade={selectedGrade}
							onClose={() => setSelectedGrade(null)}
							onMarkAsNew={handleMarkAsNew}
						/>
					)}
					{gradeToReveal && (
						<GradeLootBoxModal
							grade={gradeToReveal}
							onClose={() => setGradeToReveal(null)}
							onComplete={handleRevealComplete}
						/>
					)}
				</>
			)}
		</div>
	);
}
