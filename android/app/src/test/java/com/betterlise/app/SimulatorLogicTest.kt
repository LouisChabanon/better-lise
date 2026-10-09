package com.betterlise.app

import com.betterlise.app.data.api.Grade
import com.betterlise.app.domain.ClassCodeParser
import com.betterlise.app.domain.CoefficientInput
import com.betterlise.app.domain.ParsedClassCode
import com.betterlise.app.domain.SimulatedGrade
import com.betterlise.app.domain.SimulatorData
import com.betterlise.app.domain.SimulatorGrouping
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class SimulatorLogicTest {
    private fun grade(code: String, note: Double) = Grade(date = "01/01/2025", code = code, libelle = code, note = note, isNew = false)

    private val grades = listOf(
        grade("FITE_S7_MATA_DS", 12.0),
        grade("FITE_S7_MATA_TP", 18.0),
        grade("FITE_S8_REPA_TP", 15.0),
        grade("MYSTERY", 8.0),
    )

    @Test
    fun `parses semester and UE like the web`() {
        val cases = mapOf(
            "FITE_S7_EEAA_DS1" to ParsedClassCode("S7", "EEAA"),
            "FITE_S8_GIM2_REPA_TP" to ParsedClassCode("S8", "REPA"),
            "FITE_S6_EXP_MECA_EXAM" to ParsedClassCode("S6", "MECA"),
            "FITE_S8_GIM2_ED1_ORIA" to ParsedClassCode("S8", "ORIA"),
            "FITE_S8_GIM2_ED1" to ParsedClassCode("S8", "Autre"),
            "FITE_S8_GIM2" to ParsedClassCode("Autre", "Autre"),
            "FITE_S8_GIM2_" to ParsedClassCode("Autre", "Autre"),
            "DEMO_S8_REPA_TP2" to ParsedClassCode("S8", "REPA"),
            "MATA" to ParsedClassCode("Autre", "Autre"),
            "FITE_S5" to ParsedClassCode("Autre", "Autre"),
        )
        cases.forEach { (code, expected) -> assertEquals(code, expected, ClassCodeParser.parse(code)) }
        assertEquals(10, ClassCodeParser.semesterNumber("S10"))
        assertEquals(7, ClassCodeParser.semesterNumber("s7"))
        assertEquals(0, ClassCodeParser.semesterNumber("Autre"))
    }

    @Test
    fun `lists semesters most recent first`() {
        assertEquals(listOf("S10", "S8", "S7"), SimulatorGrouping.availableSemesters(grades + grade("FITE_S10_X_Y", 1.0)))
    }

    @Test
    fun `filters by semester but keeps unassigned grades`() {
        val groups = SimulatorGrouping.groups(grades, emptyMap(), SimulatorData(), "S7")
        assertEquals(listOf("Autre", "MATA"), groups.map { it.classCode })
        assertEquals("S7", groups[1].semester)

        val all = SimulatorGrouping.groups(grades, emptyMap(), SimulatorData(), SimulatorGrouping.ALL_SEMESTERS)
        assertEquals(listOf("Autre", "MATA", "REPA"), all.map { it.classCode })
    }

    @Test
    fun `coefficients prefer local then community then one`() {
        val data = SimulatorData(localCoeffs = mapOf("FITE_S7_MATA_TP" to 3.0))
        val weights = mapOf("FITE_S7_MATA_DS" to 2.0, "FITE_S7_MATA_TP" to 1.0)
        val mata = SimulatorGrouping.groups(grades, weights, data, "S7").first { it.classCode == "MATA" }

        val ds = mata.real.first { it.code == "FITE_S7_MATA_DS" }
        assertEquals(2.0, ds.effectiveCoeff, 0.0)
        assertTrue(ds.isCommunity)
        assertFalse(ds.canShare)
        val tp = mata.real.first { it.code == "FITE_S7_MATA_TP" }
        assertEquals(3.0, tp.effectiveCoeff, 0.0)
        assertTrue(tp.canShare)
        assertEquals((12.0 * 2 + 18 * 3) / 5, mata.currentAverage, 1e-9)
    }

    @Test
    fun `projects simulations and applies UE overrides`() {
        val data = SimulatorData(
            simulations = listOf(
                SimulatedGrade(name = "Rattrapage", grade = 20.0, coeff = 2.0, classCode = "MATA"),
                SimulatedGrade(name = "Projet", grade = 10.0, coeff = 1.0, classCode = "NEW"),
            ),
            classOverrides = mapOf("MYSTERY" to "MATA"),
        )
        val groups = SimulatorGrouping.groups(grades, emptyMap(), data, "S7")
        assertEquals(listOf("MATA", "NEW"), groups.map { it.classCode })

        val mata = groups.first()
        assertEquals(3, mata.real.size)
        assertEquals("S7", mata.semester)
        assertEquals((12.0 + 18 + 8) / 3, mata.currentAverage, 1e-9)
        assertEquals((12.0 + 18 + 8 + 40) / 5, mata.projectedAverage, 1e-9)
        assertEquals(SimulatorGrouping.SIMULATED_SEMESTER, groups[1].semester)
        assertEquals(0.0, groups[1].currentAverage, 0.0)
    }

    @Test
    fun `coefficients accept any positive decimal up to the API maximum`() {
        assertEquals(1.33, CoefficientInput.parse("1,33")!!, 0.0)
        assertEquals(1.33, CoefficientInput.parse(" 1.33 ")!!, 0.0)
        assertEquals(0.25, CoefficientInput.parse("0,25")!!, 0.0)
        assertEquals(100.0, CoefficientInput.parse("100")!!, 0.0)
        listOf("", "abc", "0", "-1", "100,01", "1,2,3", "NaN").forEach { assertNull(it, CoefficientInput.parse(it)) }
    }

    @Test
    fun `stepping keeps hundredths and stays in range`() {
        assertEquals(1.83, CoefficientInput.stepped(1.33, CoefficientInput.STEP), 0.0)
        assertEquals(0.83, CoefficientInput.stepped(1.33, -CoefficientInput.STEP), 0.0)
        assertEquals(0.33, CoefficientInput.stepped(0.33, -CoefficientInput.STEP), 0.0)
        assertEquals(100.0, CoefficientInput.stepped(100.0, CoefficientInput.STEP), 0.0)
        assertEquals(1.5, CoefficientInput.stepped(null, CoefficientInput.STEP), 0.0)
    }

    @Test
    fun `mean is zero without coefficients`() {
        assertEquals(0.0, SimulatorGrouping.mean(emptyList()), 0.0)
        assertEquals(0.0, SimulatorGrouping.mean(listOf(10.0 to 0.0)), 0.0)
    }
}
