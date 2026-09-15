package com.betterlise.app.domain

import com.betterlise.app.data.api.Grade
import kotlinx.serialization.Serializable
import java.util.UUID

/** A hypothetical grade added by the user. */
@Serializable
data class SimulatedGrade(
    val id: String = UUID.randomUUID().toString(),
    val name: String,
    val grade: Double,
    val coeff: Double,
    val classCode: String,
)

/** What the user changed in the simulator, persisted on the device. */
@Serializable
data class SimulatorData(
    val simulations: List<SimulatedGrade> = emptyList(),
    /** Coefficients typed by the user, by grade code. They win over community ones. */
    val localCoeffs: Map<String, Double> = emptyMap(),
    /** UE chosen by the user for grades whose code doesn't parse, by grade code. */
    val classOverrides: Map<String, String> = emptyMap(),
)

data class SimulatorRealGrade(
    val grade: Grade,
    /** Community coefficient, or 1 without votes. */
    val baseCoeff: Double,
    val isCommunity: Boolean,
    val effectiveCoeff: Double,
) {
    val code: String get() = grade.code
    /** The user's coefficient differs from the shared one: it can be shared. */
    val canShare: Boolean get() = effectiveCoeff != baseCoeff
}

data class UEGroup(
    val classCode: String,
    val semester: String,
    val real: List<SimulatorRealGrade>,
    val simulations: List<SimulatedGrade>,
) {
    private val realItems get() = real.map { it.grade.note to it.effectiveCoeff }
    val currentAverage: Double get() = SimulatorGrouping.mean(realItems)
    val projectedAverage: Double get() = SimulatorGrouping.mean(realItems + simulations.map { it.grade to it.coeff })
    val hasSimulations: Boolean get() = simulations.isNotEmpty()
}

/** Grade simulator rules, ported from the web (hooks/useGradeSimulation.ts). */
object SimulatorGrouping {
    const val ALL_SEMESTERS = "all"
    const val SIMULATED_SEMESTER = "Sim"

    /** Semesters found in the grade codes, most recent first. */
    fun availableSemesters(grades: List<Grade>): List<String> =
        grades.map { ClassCodeParser.parse(it.code).semester }
            .filter { it != ClassCodeParser.UNASSIGNED }
            .distinct()
            .sortedByDescending(ClassCodeParser::semesterNumber)

    fun groups(grades: List<Grade>, weights: Map<String, Double>, data: SimulatorData, semester: String): List<UEGroup> {
        val semesters = LinkedHashMap<String, String>()
        val real = mutableMapOf<String, MutableList<SimulatorRealGrade>>()
        val simulations = mutableMapOf<String, MutableList<SimulatedGrade>>()

        fun register(classCode: String, groupSemester: String, isReal: Boolean) {
            val current = semesters[classCode]
            if (current == null) {
                semesters[classCode] = groupSemester
            } else if (isReal && current == ClassCodeParser.UNASSIGNED && groupSemester != ClassCodeParser.UNASSIGNED) {
                semesters[classCode] = groupSemester
            }
        }

        for (grade in grades) {
            val parsed = ClassCodeParser.parse(grade.code)
            val included = semester == ALL_SEMESTERS || parsed.semester == semester || parsed.semester == ClassCodeParser.UNASSIGNED
            if (!included) continue
            val classCode = data.classOverrides[grade.code] ?: parsed.classCode
            register(classCode, parsed.semester, isReal = true)
            val community = weights[grade.code]
            val baseCoeff = community ?: 1.0
            real.getOrPut(classCode, ::mutableListOf) += SimulatorRealGrade(
                grade = grade,
                baseCoeff = baseCoeff,
                isCommunity = community != null,
                effectiveCoeff = data.localCoeffs[grade.code] ?: baseCoeff,
            )
        }

        for (simulation in data.simulations) {
            val classCode = simulation.classCode.ifEmpty { ClassCodeParser.UNASSIGNED }
            register(classCode, SIMULATED_SEMESTER, isReal = false)
            simulations.getOrPut(classCode, ::mutableListOf) += simulation
        }

        return semesters.keys.sorted().map {
            UEGroup(it, semesters.getValue(it), real[it].orEmpty(), simulations[it].orEmpty())
        }
    }

    /** Weighted mean, 0 when coefficients sum to 0. */
    fun mean(items: List<Pair<Double, Double>>): Double {
        val totalCoeff = items.sumOf { it.second }
        if (totalCoeff == 0.0) return 0.0
        return items.sumOf { it.first * it.second } / totalCoeff
    }
}
