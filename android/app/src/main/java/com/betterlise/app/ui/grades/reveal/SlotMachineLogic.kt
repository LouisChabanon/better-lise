package com.betterlise.app.ui.grades.reveal

import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.Easing
import kotlin.math.max
import kotlin.math.roundToInt

/** One reel of the slot machine: a 0–9 strip looping [loops] times before landing on [digit]. */
data class SlotReel(
    /** Left to right: tens, units, tenths, hundredths. */
    val index: Int,
    val digit: Int,
    val loops: Int,
    val durationMs: Long,
    val easing: Easing,
) {
    /** Strip index the reel lands on. */
    val target: Int get() = SlotReveal.targetIndex(loops, digit)
    val stopOrder: Int get() = SlotReveal.stopOrder(index)
    val stripSize: Int get() = (loops + 1) * SlotReveal.DIGITS_PER_LOOP

    fun isStopped(elapsedMs: Long): Boolean = elapsedMs >= durationMs

    fun position(elapsedMs: Long): Float = SlotReveal.position(elapsedMs, target.toFloat(), durationMs, easing)
}

/**
 * Port of the web slot machine (lib/utils/slot-utils.ts + components/slot-machine). Digits roll and stop one
 * by one from the least significant, each more significant reel spinning slower and longer.
 */
object SlotReveal {
    const val REEL_COUNT = 4
    const val DIGITS_PER_LOOP = 10
    /** The decimal separator sits after the units reel. */
    const val DECIMAL_SEPARATOR_AFTER = 1
    /** Fraction of the run spent spinning; the rest settles back from the overshoot. */
    const val SETTLE_AT = 0.93f
    /** The reel slightly overshoots its digit then settles back, like a real reel catching (in digits). */
    const val OVERSHOOT = 0.22f
    const val REDUCED_MOTION_MS = 300L

    private const val MAX_GRADE = 20.0
    // Indexed by stop order (hundredths first, tens last)
    private val STOP_MS = longArrayOf(1_200, 2_300, 3_800, 5_800)
    private val LOOPS_PER_SECOND = doubleArrayOf(5.0, 3.4, 2.1, 1.3)
    private val SPIN_EASINGS = listOf(
        CubicBezierEasing(0.15f, 0.55f, 0.2f, 1f),
        CubicBezierEasing(0.12f, 0.65f, 0.15f, 1f),
        CubicBezierEasing(0.1f, 0.72f, 0.1f, 1f),
        CubicBezierEasing(0.08f, 0.8f, 0.05f, 1f),
    )
    private val SettleEasing = CubicBezierEasing(0.4f, 0f, 0.2f, 1f)

    /** `[tens, units, tenths, hundredths]` of the grade clamped to 0–20. */
    fun digits(grade: Double): List<Int> {
        val safe = if (grade.isFinite()) grade.coerceIn(0.0, MAX_GRADE) else 0.0
        val hundredths = (safe * 100).roundToInt()
        return listOf(hundredths / 1000, hundredths / 100 % 10, hundredths / 10 % 10, hundredths % 10)
    }

    /** Least significant digit stops first: hundredths → 0, tens → 3. */
    fun stopOrder(reelIndex: Int): Int = REEL_COUNT - 1 - reelIndex

    fun durationMs(reelIndex: Int, reducedMotion: Boolean): Long =
        if (reducedMotion) REDUCED_MOTION_MS else STOP_MS[stopOrder(reelIndex)]

    /** Number of full 0–9 loops the reel scrolls through before landing. */
    fun loops(reelIndex: Int, reducedMotion: Boolean): Int {
        if (reducedMotion) return 0
        val order = stopOrder(reelIndex)
        return max(1, (STOP_MS[order] / 1_000.0 * LOOPS_PER_SECOND[order]).roundToInt())
    }

    fun targetIndex(loops: Int, digit: Int): Int = loops * DIGITS_PER_LOOP + digit

    fun reels(grade: Double, reducedMotion: Boolean): List<SlotReel> =
        digits(grade).mapIndexed { index, digit ->
            SlotReel(
                index = index,
                digit = digit,
                loops = loops(index, reducedMotion),
                durationMs = durationMs(index, reducedMotion),
                easing = SPIN_EASINGS[stopOrder(index)],
            )
        }

    /** Strip position in digits (0 = first digit in the window): eased spin past the target, then settle back. */
    fun position(elapsedMs: Long, target: Float, durationMs: Long, easing: Easing): Float {
        val progress = if (durationMs > 0) (elapsedMs.toFloat() / durationMs).coerceIn(0f, 1f) else 1f
        if (progress >= 1f) return target
        val peak = target + OVERSHOOT
        if (progress < SETTLE_AT) return peak * easing.transform(progress / SETTLE_AT)
        return peak - OVERSHOOT * SettleEasing.transform((progress - SETTLE_AT) / (1 - SETTLE_AT))
    }

    fun stoppedCount(reels: List<SlotReel>, elapsedMs: Long): Int = reels.count { it.isStopped(elapsedMs) }

    /**
     * Changes each time the next reel to stop shows a new digit, or a reel stops: only that reel ticks, so
     * the sound slows down as it lands.
     */
    fun tickKey(reels: List<SlotReel>, elapsedMs: Long): Int {
        val stopped = stoppedCount(reels, elapsedMs)
        val next = reels.firstOrNull { it.stopOrder == stopped } ?: return -stopped
        return stopped * 1_000 + next.position(elapsedMs).roundToInt()
    }

    /** The leading zero of a grade under 10 is dimmed once landed. */
    fun isDimmed(reel: SlotReel): Boolean = reel.index == 0 && reel.digit == 0
}
