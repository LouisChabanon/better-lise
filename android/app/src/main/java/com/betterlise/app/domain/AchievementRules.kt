package com.betterlise.app.domain

import com.betterlise.app.data.api.Achievement
import com.betterlise.app.data.api.AchievementRarity

/** Progress figures for the achievements header. */
data class AchievementSummary(
    val total: Int,
    val unlocked: Int,
    val legendary: Int,
    val rare: Int,
    val secrets: Int,
    val secretsFound: Int,
) {
    /** Between 0 and 1. */
    val progress: Double get() = if (total == 0) 0.0 else unlocked.toDouble() / total

    companion object {
        fun of(achievements: List<Achievement>): AchievementSummary {
            val unlocked = achievements.filter { it.isUnlocked }
            return AchievementSummary(
                total = achievements.size,
                unlocked = unlocked.size,
                legendary = unlocked.count { it.rarity == AchievementRarity.Legendary },
                rare = unlocked.count { it.rarity == AchievementRarity.Rare },
                secrets = achievements.count { it.isSecret },
                secretsFound = unlocked.count { it.isSecret },
            )
        }
    }
}

/** Decides which unlocks deserve a celebration, from the codes already celebrated on this device. */
object AchievementCelebration {
    /** First launch for an account: everything already unlocked counts as seen, except what this sync unlocked. */
    fun initialSeen(achievements: List<Achievement>, newlyUnlocked: List<String>): Set<String> =
        achievements.filter { it.isUnlocked }.map { it.code }.toSet() - newlyUnlocked.toSet()

    /** Unlocked achievements not celebrated yet, in list order. */
    fun pending(achievements: List<Achievement>, seen: Set<String>): List<Achievement> =
        achievements.filter { it.isUnlocked && it.code !in seen }

    /** Reveal mode hides new grades: celebrating a 20/20 before its reveal would spoil it. */
    fun shouldDefer(revealMode: Boolean, unreadGrades: Int): Boolean = revealMode && unreadGrades > 0
}
