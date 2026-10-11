package com.betterlise.app

import com.betterlise.app.data.settings.RevealAnimation
import com.betterlise.app.ui.grades.reveal.SlotReveal
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import kotlin.math.abs

class SlotMachineLogicTest {
    @Test
    fun `digits match the web formatting`() {
        val cases = mapOf(
            18.5 to listOf(1, 8, 5, 0), 7.25 to listOf(0, 7, 2, 5), 20.0 to listOf(2, 0, 0, 0), 0.0 to listOf(0, 0, 0, 0),
            12.345 to listOf(1, 2, 3, 5), 25.0 to listOf(2, 0, 0, 0), -3.0 to listOf(0, 0, 0, 0), Double.NaN to listOf(0, 0, 0, 0),
        )
        cases.forEach { (grade, digits) -> assertEquals("grade $grade", digits, SlotReveal.digits(grade)) }
    }

    @Test
    fun `least significant reel stops first and each later reel spins longer`() {
        val reels = SlotReveal.reels(14.75, reducedMotion = false)
        assertEquals(listOf(3, 2, 1, 0), reels.map { it.stopOrder })
        assertEquals(listOf(5_800L, 3_800L, 2_300L, 1_200L), reels.map { it.durationMs })
        assertEquals(listOf(8, 8, 8, 6), reels.map { it.loops })
    }

    @Test
    fun `reduced motion lands quickly without looping`() {
        val reels = SlotReveal.reels(14.75, reducedMotion = true)
        assertTrue(reels.all { it.durationMs == SlotReveal.REDUCED_MOTION_MS && it.loops == 0 })
        assertEquals(listOf(1, 4, 7, 5), reels.map { it.target })
    }

    @Test
    fun `target index lands on the grade digit of the strip`() {
        val reel = SlotReveal.reels(7.0, reducedMotion = false)[1]
        assertEquals(7, reel.target % SlotReveal.DIGITS_PER_LOOP)
        assertEquals((reel.loops + 1) * SlotReveal.DIGITS_PER_LOOP, reel.stripSize)
        assertTrue(reel.target < reel.stripSize)
    }

    @Test
    fun `position overshoots then settles on the target`() {
        val reel = SlotReveal.reels(9.0, reducedMotion = false)[1]
        val target = reel.target.toFloat()
        val settleMs = (reel.durationMs * SlotReveal.SETTLE_AT).toLong()
        assertEquals(0f, reel.position(0), 0f)
        assertEquals(0f, reel.position(-100), 0f)
        assertTrue(abs(reel.position(settleMs) - (target + SlotReveal.OVERSHOOT)) < 0.01f)
        val settling = reel.position((reel.durationMs * 0.97).toLong())
        assertTrue(settling > target && settling < target + SlotReveal.OVERSHOOT)
        assertEquals(target, reel.position(reel.durationMs), 0f)
        assertEquals(target, reel.position(60_000), 0f)
        val samples = (0..settleMs step 20).map(reel::position)
        assertTrue("monotonic while spinning", samples.zipWithNext().all { (a, b) -> a <= b })
    }

    @Test
    fun `reels stop one by one`() {
        val reels = SlotReveal.reels(9.99, reducedMotion = false)
        assertEquals(0, SlotReveal.stoppedCount(reels, 0))
        assertEquals(1, SlotReveal.stoppedCount(reels, 1_200))
        assertEquals(2, SlotReveal.stoppedCount(reels, 3_000))
        assertEquals(3, SlotReveal.stoppedCount(reels, 4_000))
        assertEquals(4, SlotReveal.stoppedCount(reels, 5_800))
    }

    @Test
    fun `only the next reel to stop drives ticks`() {
        val reels = SlotReveal.reels(9.99, reducedMotion = false)
        val tenths = reels[2]
        assertEquals(1_000 + Math.round(tenths.position(1_500)), SlotReveal.tickKey(reels, 1_500))
        assertEquals(SlotReveal.tickKey(reels, 6_000), SlotReveal.tickKey(reels, 60_000))
    }

    @Test
    fun `only the leading zero is dimmed`() {
        assertEquals(listOf(true, false, false, false), SlotReveal.reels(7.05, reducedMotion = false).map(SlotReveal::isDimmed))
        assertFalse(SlotReveal.reels(17.05, reducedMotion = false).any(SlotReveal::isDimmed))
    }

    @Test
    fun `reveal animation shares the web stored values`() {
        assertEquals(RevealAnimation.Case, RevealAnimation.fromId("case"))
        assertEquals(RevealAnimation.Slot, RevealAnimation.fromId("slot"))
        assertEquals(null, RevealAnimation.fromId("unknown"))
    }
}
