package com.betterlise.app.ui.grades.reveal

import androidx.compose.animation.core.CubicBezierEasing
import kotlin.math.floor
import kotlin.random.Random

/** Grade tiers of the web reveal (lib/utils/game-utils.ts `getRarity`). Internal only: picks the reveal color. */
enum class GradeRarity(val argb: Long) {
    // Same Tailwind v4 tokens as the web (red-700, orange-700, blue-600, fuchsia-700, amber-400)
    Poor(0xFFC10007),
    Basic(0xFFCA3500),
    Common(0xFF155DFC),
    Epic(0xFFA800B7),
    Legendary(0xFFFFB900);

    companion object {
        fun of(grade: Double): GradeRarity = when {
            grade >= 18 -> Legendary
            grade >= 14 -> Epic
            grade >= 10 -> Common
            grade >= 7 -> Basic
            else -> Poor
        }
    }
}

data class RevealItem(val id: Int, val grade: Double) {
    val rarity: GradeRarity get() = GradeRarity.of(grade)
}

/** Port of the web reel (components/LootCase.tsx). Distances are in dp. */
object GradeReveal {
    const val REEL_SIZE = 50
    const val TARGET_INDEX = 47
    const val ITEM_WIDTH = 120f
    const val ROLL_DURATION_MS = 8_000
    const val REVEAL_HOLD_MS = 3_000L
    const val CONFETTI_THRESHOLD = 10.0

    /** `cubic-bezier(0, 0.65, 0.45, 1)`: fast start, long suspenseful deceleration. */
    val Easing = CubicBezierEasing(0f, 0.65f, 0.45f, 1f)

    /**
     * Random grades (uniform 0–20, "more fun" than a bell curve on the web) with the real grade hidden at
     * the target index. [random] returns values in 0 until 1.
     */
    fun makeReel(target: Double, random: () -> Double = { Random.nextDouble() }): List<RevealItem> =
        List(REEL_SIZE) { index ->
            val value = random() * 20
            RevealItem(id = index, grade = if (index == TARGET_INDEX) target else value)
        }

    /** Reel offset that centers the target item, shifted by up to ±20 % of an item ([jitterUnit] in 0 until 1). */
    fun stopOffset(containerWidth: Float, itemWidth: Float = ITEM_WIDTH, jitterUnit: Double): Float {
        val centerOffset = containerWidth / 2 - itemWidth / 2
        val jitter = ((jitterUnit - 0.5) * itemWidth * 0.4).toFloat()
        return -(TARGET_INDEX * itemWidth) + centerOffset + jitter
    }

    /** Index of the item under the center marker; each change is a "tick". */
    fun centeredIndex(offset: Float, containerWidth: Float, itemWidth: Float = ITEM_WIDTH): Int =
        floor((containerWidth / 2 - offset) / itemWidth).toInt()

    fun shouldCelebrate(grade: Double): Boolean = grade >= CONFETTI_THRESHOLD
}
