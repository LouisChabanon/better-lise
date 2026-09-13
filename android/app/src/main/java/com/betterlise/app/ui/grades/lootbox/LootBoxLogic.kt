package com.betterlise.app.ui.grades.lootbox

import androidx.compose.animation.core.CubicBezierEasing
import kotlin.math.floor
import kotlin.random.Random

/** Rarity tiers of the web casino mode (lib/utils/game-utils.ts `getRarity`). */
enum class LootRarity(val label: String, val argb: Long) {
    // Same Tailwind v4 tokens as the web (red-700, orange-700, blue-600, fuchsia-700, amber-400)
    Poor("Poor", 0xFFC10007),
    Basic("Basic", 0xFFCA3500),
    Common("Common", 0xFF155DFC),
    Epic("Epic", 0xFFA800B7),
    Legendary("Legendary", 0xFFFFB900);

    companion object {
        fun of(grade: Double): LootRarity = when {
            grade >= 18 -> Legendary
            grade >= 14 -> Epic
            grade >= 10 -> Common
            grade >= 7 -> Basic
            else -> Poor
        }
    }
}

data class LootItem(val id: Int, val grade: Double) {
    val rarity: LootRarity get() = LootRarity.of(grade)
}

/** Port of the web reel (components/LootCase.tsx). Distances are in dp. */
object LootBox {
    const val REEL_SIZE = 50
    const val WINNING_INDEX = 47
    const val ITEM_WIDTH = 120f
    const val ROLL_DURATION_MS = 8_000
    const val REVEAL_HOLD_MS = 3_000L
    const val CONFETTI_THRESHOLD = 10.0

    /** `cubic-bezier(0, 0.65, 0.45, 1)`: fast start, long suspenseful deceleration. */
    val Easing = CubicBezierEasing(0f, 0.65f, 0.45f, 1f)

    /**
     * Random grades (uniform 0–20, "more fun" than a bell curve on the web) with the real grade hidden at
     * the winning index. [random] returns values in 0 until 1.
     */
    fun makeReel(winning: Double, random: () -> Double = { Random.nextDouble() }): List<LootItem> =
        List(REEL_SIZE) { index ->
            val value = random() * 20
            LootItem(id = index, grade = if (index == WINNING_INDEX) winning else value)
        }

    /** Reel offset that centers the winning item, shifted by up to ±20 % of an item ([jitterUnit] in 0 until 1). */
    fun stopOffset(containerWidth: Float, itemWidth: Float = ITEM_WIDTH, jitterUnit: Double): Float {
        val centerOffset = containerWidth / 2 - itemWidth / 2
        val jitter = ((jitterUnit - 0.5) * itemWidth * 0.4).toFloat()
        return -(WINNING_INDEX * itemWidth) + centerOffset + jitter
    }

    /** Index of the item under the center marker; each change is a "tick". */
    fun centeredIndex(offset: Float, containerWidth: Float, itemWidth: Float = ITEM_WIDTH): Int =
        floor((containerWidth / 2 - offset) / itemWidth).toInt()

    fun shouldCelebrate(grade: Double): Boolean = grade >= CONFETTI_THRESHOLD
}
