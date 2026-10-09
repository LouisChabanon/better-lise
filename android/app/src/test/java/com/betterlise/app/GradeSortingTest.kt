package com.betterlise.app

import com.betterlise.app.data.api.Grade
import com.betterlise.app.domain.GradeSorting
import com.betterlise.app.domain.LiseId
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.LocalDate

class GradeSortingTest {
    private fun grade(code: String, date: String, isNew: Boolean? = false) =
        Grade(date = date, code = code, libelle = code, note = 12.0, isNew = isNew)

    @Test
    fun `unread grades come first then most recent`() {
        val sorted = GradeSorting.sorted(
            listOf(grade("old", "01/01/2024"), grade("recent", "15/03/2025"), grade("new", "01/09/2023", true), grade("bad", "n/a", null)),
        )
        assertEquals(listOf("new", "recent", "old", "bad"), sorted.map { it.code })
    }

    @Test
    fun `parses lise dates`() {
        assertEquals(LocalDate.of(2025, 2, 5), GradeSorting.parseLiseDate("05/02/2025"))
        assertNull(GradeSorting.parseLiseDate("2025-02-05"))
        assertNull(GradeSorting.parseLiseDate("31/02/2025"))
    }

    @Test
    fun `grade tiers and distribution bins`() {
        assertEquals(GradeSorting.Tier.Failing, GradeSorting.tier(9.99))
        assertEquals(GradeSorting.Tier.Passing, GradeSorting.tier(10.0))
        assertEquals(GradeSorting.Tier.Good, GradeSorting.tier(12.0))
        assertEquals(0, GradeSorting.binIndex(-1.0))
        assertEquals(6, GradeSorting.binIndex(13.5))
        assertEquals(9, GradeSorting.binIndex(20.0))
    }

    @Test
    fun `validates lise ids`() {
        assertTrue(LiseId.isValid("2023-1234"))
        assertFalse(LiseId.isValid("2023-12345"))
        assertFalse(LiseId.isValid("abcd-1234"))
    }
}
