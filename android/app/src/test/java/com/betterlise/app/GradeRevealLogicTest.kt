package com.betterlise.app

import com.betterlise.app.ui.grades.reveal.GradeReveal
import com.betterlise.app.ui.grades.reveal.GradeRarity
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import kotlin.math.abs

class GradeRevealLogicTest {
    @Test
    fun `rarity thresholds match the web`() {
        val cases = mapOf(
            20.0 to GradeRarity.Legendary, 18.0 to GradeRarity.Legendary, 17.99 to GradeRarity.Epic, 14.0 to GradeRarity.Epic,
            13.5 to GradeRarity.Common, 10.0 to GradeRarity.Common, 9.99 to GradeRarity.Basic, 7.0 to GradeRarity.Basic,
            6.99 to GradeRarity.Poor, 0.0 to GradeRarity.Poor,
        )
        cases.forEach { (grade, rarity) -> assertEquals("grade $grade", rarity, GradeRarity.of(grade)) }
    }

    @Test
    fun `rarity colors are the web tailwind tokens`() {
        assertEquals(0xFFFFB900, GradeRarity.Legendary.argb)
        assertEquals(0xFFA800B7, GradeRarity.Epic.argb)
        assertEquals(0xFF155DFC, GradeRarity.Common.argb)
        assertEquals(0xFFCA3500, GradeRarity.Basic.argb)
        assertEquals(0xFFC10007, GradeRarity.Poor.argb)
    }

    @Test
    fun `reel hides the real grade at the target index`() {
        val values = mutableListOf(0.0, 0.5, 0.999)
        val reel = GradeReveal.makeReel(target = 16.25) { values.removeFirstOrNull() ?: 0.25 }

        assertEquals(GradeReveal.REEL_SIZE, reel.size)
        assertEquals(16.25, reel[GradeReveal.TARGET_INDEX].grade, 0.0)
        assertEquals(0.0, reel[0].grade, 1e-9)
        assertEquals(10.0, reel[1].grade, 1e-9)
        assertEquals(19.98, reel[2].grade, 1e-3)
        assertTrue(reel.all { it.grade in 0.0..20.0 })
        assertEquals(GradeReveal.REEL_SIZE, reel.map { it.id }.toSet().size)
    }

    @Test
    fun `stop offset centers the target item with bounded jitter`() {
        val width = 400f
        val centered = GradeReveal.stopOffset(containerWidth = width, jitterUnit = 0.5)
        assertEquals(-(47 * 120f) + (200f - 60f), centered, 0.001f)
        assertEquals(GradeReveal.TARGET_INDEX, GradeReveal.centeredIndex(centered, width))

        listOf(0.0, 0.25, 0.75, 0.9999).forEach { unit ->
            val offset = GradeReveal.stopOffset(containerWidth = width, jitterUnit = unit)
            assertTrue(abs(offset - centered) <= 24f)
            assertEquals(GradeReveal.TARGET_INDEX, GradeReveal.centeredIndex(offset, width))
        }
    }

    @Test
    fun `easing matches the web curve`() {
        val easing = GradeReveal.Easing
        assertEquals(0f, easing.transform(0f), 0.001f)
        assertEquals(1f, easing.transform(1f), 0.001f)
        val samples = (0..100).map { easing.transform(it / 100f) }
        assertTrue(samples.zipWithNext().all { (a, b) -> a <= b + 1e-4f })
        assertTrue(easing.transform(0.25f) > 0.5f)
        assertTrue(easing.transform(0.9f) > 0.97f)
    }

    @Test
    fun `centered index advances as the reel scrolls`() {
        assertEquals(1, GradeReveal.centeredIndex(0f, 400f))
        assertEquals(2, GradeReveal.centeredIndex(-120f, 400f))
        assertEquals(2, GradeReveal.centeredIndex(-121f, 400f))
    }

    @Test
    fun `celebrates only passing grades`() {
        assertTrue(GradeReveal.shouldCelebrate(10.0))
        assertFalse(GradeReveal.shouldCelebrate(9.99))
    }
}
