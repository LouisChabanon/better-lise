package com.betterlise.app.domain

object LiseId {
    private val pattern = Regex("""\d{4}-\d{4}""")
    fun isValid(value: String) = pattern.matches(value)
}
