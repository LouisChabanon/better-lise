package com.betterlise.app.domain

import kotlin.math.roundToLong

/** Free-form coefficients (e.g. 1,33): Savoir's weights are rarely multiples of 0,5. */
object CoefficientInput {
    /** The API refuses shared coefficients above this. */
    const val MAXIMUM = 100.0
    const val STEP = 0.5

    /** Accepts a comma or a dot as decimal separator; null when not a usable coefficient. */
    fun parse(text: String): Double? = text.trim().replace(',', '.').toDoubleOrNull()?.takeIf(::isValid)

    fun isValid(value: Double): Boolean = value.isFinite() && value > 0 && value <= MAXIMUM

    /** − / + buttons: moves by [STEP], rounded to hundredths, never reaching 0 or passing the maximum. */
    fun stepped(value: Double?, delta: Double): Double {
        val current = value ?: 1.0
        val next = ((current + delta) * 100).roundToLong() / 100.0
        return if (isValid(next)) next else current
    }
}
