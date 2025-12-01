"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { GradeType } from "@/lib/types";
import { getCommunityWeights, WeightMap } from "@/actions/CommunityWeights";
import { RealGradeWithCoeff, SimulatedGrade, ClassGroup } from "@/lib/types";
import {
	parseClassCode,
	getSemesterNumber,
} from "@/lib/utils/simulation-utils";
import posthog from "posthog-js";

const STORAGE_KEY = "grade-simulator-v1-storage";

export function useGradeSimulation(initialGrades: GradeType[]) {
	const [simulatedGrades, setSimulatedGrades] = useState<SimulatedGrade[]>([]);
	const [communityWeights, setCommunityWeights] = useState<WeightMap>({});
	const [selectedSemester, setSelectedSemester] = useState<string>("");
	const [classOverrides, setClassOverrides] = useState<Record<string, string>>(
		{}
	);
	const [localCoeffs, setLocalCoeffs] = useState<Record<string, number>>({});

	const [isLoaded, setIsLoaded] = useState(false);

	// 1. Load Community Weights
	useEffect(() => {
		getCommunityWeights().then(setCommunityWeights).catch(console.error);

		try {
			const savedData = localStorage.getItem(STORAGE_KEY);
			if (savedData) {
				const parsed = JSON.parse(savedData);
				if (parsed.simulatedGrades) setSimulatedGrades(parsed.simulatedGrades);
				if (parsed.classOverrides) setClassOverrides(parsed.classOverrides);
				if (parsed.localCoeffs) setLocalCoeffs(parsed.localCoeffs);
			}
		} catch (e) {
			console.error("Failed to load grade simulation data", e);
		} finally {
			setIsLoaded(true);
		}
	}, []);

	useEffect(() => {
		if (!isLoaded) return;

		const dataToSave = {
			simulatedGrades,
			classOverrides,
			localCoeffs,
		};
		localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
	}, [simulatedGrades, classOverrides, localCoeffs, isLoaded]);

	// 2. Determine Available Semesters
	const availableSemesters = useMemo(() => {
		const sems = new Set<string>();
		initialGrades.forEach((g) => {
			const { semester } = parseClassCode(g.code);
			if (semester && semester !== "Autre") sems.add(semester);
		});
		return Array.from(sems).sort(
			(a, b) => getSemesterNumber(b) - getSemesterNumber(a)
		);
	}, [initialGrades]);

	// Default selection
	useEffect(() => {
		if (availableSemesters.length > 0 && !selectedSemester) {
			setSelectedSemester(availableSemesters[0]);
		}
	}, [availableSemesters, selectedSemester]);

	// 3. Process Real Grades (Apply filters & weights)
	const realGradesWithWeights = useMemo(() => {
		return initialGrades
			.filter((g) => !isNaN(Number(g.note)))
			.filter((g) => {
				if (!selectedSemester || selectedSemester === "all") return true;
				const { semester } = parseClassCode(g.code);
				return semester === selectedSemester || semester === "Autre";
			})
			.map((g) => {
				const commWeight = communityWeights[g.code];
				return {
					...g,
					coeff: commWeight !== undefined ? commWeight : 1,
					isCommunity: commWeight !== undefined,
				} as RealGradeWithCoeff;
			});
	}, [initialGrades, communityWeights, selectedSemester]);

	// Helper to get coeff (local override > community > default)
	const getEffectiveCoeff = useCallback(
		(g: RealGradeWithCoeff) => {
			return localCoeffs[g.code] !== undefined ? localCoeffs[g.code] : g.coeff;
		},
		[localCoeffs]
	);

	// 4. Group Data by Class Code (nom UE)
	const groupedData = useMemo(() => {
		const groups: Record<string, ClassGroup> = {};

		// Group Real
		realGradesWithWeights.forEach((g) => {
			const parsed = parseClassCode(g.code);
			const targetClass = classOverrides[g.code] || parsed.classCode;

			if (!groups[targetClass]) {
				groups[targetClass] = {
					semester: parsed.semester,
					classCode: targetClass,
					real: [],
					sim: [],
				};
			} else {
				if (
					groups[targetClass].semester === "Autre" &&
					parsed.semester !== "Autre"
				) {
					groups[targetClass].semester = parsed.semester;
				}
			}
			groups[targetClass].real.push(g);
		});

		// Group Simulated
		simulatedGrades.forEach((s) => {
			const targetClass = s.classCode || "Autre";
			if (!groups[targetClass]) {
				groups[targetClass] = {
					semester: "Sim",
					classCode: targetClass,
					real: [],
					sim: [],
				};
			}
			groups[targetClass].sim.push(s);
		});

		return groups;
	}, [realGradesWithWeights, simulatedGrades, classOverrides]);

	// --- Actions ---

	const addSimulation = (sim: SimulatedGrade) => {
		setSimulatedGrades((prev) => [...prev, sim]);
		if (posthog.has_opted_in_capturing()) {
			posthog.capture("simulation_created", {
				UE: sim.classCode,
				grade: sim.grade,
				coeff: sim.coeff,
			});
		}
	};

	const removeSimulation = (id: string) => {
		setSimulatedGrades((prev) => prev.filter((s) => s.id !== id));
		if (posthog.has_opted_in_capturing()) {
			posthog.capture("simulation_removed", {
				simulation_id: id,
			});
		}
	};

	const updateSimulation = (id: string, val: number) => {
		setSimulatedGrades((prev) =>
			prev.map((s) => (s.id === id ? { ...s, grade: val } : s))
		);
	};

	const handleLocalCoeffChange = (code: string, val: number) => {
		setLocalCoeffs((prev) => ({ ...prev, [code]: val }));
	};

	const handleClassOverride = (code: string, newClass: string) => {
		setClassOverrides((prev) => ({ ...prev, [code]: newClass }));
		if (posthog.has_opted_in_capturing()) {
			posthog.capture("UE_overridden", {
				code: code,
				new_UE: newClass,
			});
		}
	};

	const onWeightSubmitSuccess = (code: string, weight: number) => {
		setCommunityWeights((prev) => ({ ...prev, [code]: weight }));
		const newLocal = { ...localCoeffs };
		delete newLocal[code];
		setLocalCoeffs(newLocal);

		if (posthog.has_opted_in_capturing()) {
			posthog.capture("weight_voted", {
				code,
				weight,
			});
		}
	};

	return {
		groupedData,
		availableSemesters,
		selectedSemester,
		setSelectedSemester,
		availableClasses: Object.keys(groupedData).sort(),
		addSimulation,
		removeSimulation,
		updateSimulation,
		getEffectiveCoeff,
		handleLocalCoeffChange,
		handleClassOverride,
		onWeightSubmitSuccess,
	};
}
