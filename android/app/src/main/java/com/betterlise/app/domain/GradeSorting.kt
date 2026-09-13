package com.betterlise.app.domain

import com.betterlise.app.data.api.Grade
import java.time.LocalDate

object GradeSorting {
    enum class Tier { Failing, Passing, Good }

    /** Unread grades first, then most recent Lise (dd/MM/yyyy) date first. */
    fun sorted(grades: List<Grade>): List<Grade> = grades.sortedWith(
        compareByDescending<Grade> { it.isUnread }
            .thenByDescending { parseLiseDate(it.date) ?: LocalDate.MIN },
    )

    fun parseLiseDate(value: String): LocalDate? {
        val parts = value.split("/").mapNotNull { it.toIntOrNull() }
        if (parts.size != 3) return null
        return runCatching { LocalDate.of(parts[2], parts[1], parts[0]) }.getOrNull()
    }

    fun tier(note: Double): Tier = when {
        note < 10 -> Tier.Failing
        note < 12 -> Tier.Passing
        else -> Tier.Good
    }

    /** Index of the distribution bin (2-point bins, 20 counted in the last one). */
    fun binIndex(note: Double, binCount: Int = 10): Int = (note / 2).toInt().coerceIn(0, binCount - 1)
}
