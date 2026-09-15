package com.betterlise.app.domain

/** UE and semester of a Lise grade code, ported from the web simulator (lib/utils/simulation-utils.ts). */
data class ParsedClassCode(val semester: String, val classCode: String)

object ClassCodeParser {
    const val UNASSIGNED = "Autre"

    /** Program segments that sit where the UE usually is: the UE follows them. */
    private val programSegments = setOf("GIE2", "GIE1", "GIM2", "GIM1", "EXP")
    private val semesterNumber = Regex("[Ss](\\d+)")

    /** Codes look like `FITE_[semester]_[UE]_…`, sometimes with a program (and an `ED…` group) before the UE. */
    fun parse(code: String): ParsedClassCode {
        val parts = code.split("_")
        if (parts.size < 3) return ParsedClassCode(UNASSIGNED, UNASSIGNED)

        val semester = parts[1]
        if (parts[2] !in programSegments) return ParsedClassCode(semester, parts[2])
        val next = parts.getOrNull(3)
        if (next.isNullOrEmpty()) return ParsedClassCode(UNASSIGNED, UNASSIGNED)
        if (!next.startsWith("ED")) return ParsedClassCode(semester, next)
        return ParsedClassCode(semester, parts.getOrNull(4) ?: UNASSIGNED)
    }

    /** `S7` → 7, 0 when the semester has no number. */
    fun semesterNumber(semester: String): Int =
        semesterNumber.find(semester)?.groupValues?.get(1)?.toIntOrNull() ?: 0
}
