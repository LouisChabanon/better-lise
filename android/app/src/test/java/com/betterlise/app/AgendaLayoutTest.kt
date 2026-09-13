package com.betterlise.app

import com.betterlise.app.data.api.CalendarEvent
import com.betterlise.app.domain.AgendaLayout
import com.betterlise.app.domain.PARIS
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.LocalDate
import java.time.LocalDateTime

class AgendaLayoutTest {
    private fun at(day: Int, hour: Int, minute: Int = 0) =
        LocalDateTime.of(2025, 3, day, hour, minute).atZone(PARIS).toInstant()

    private fun event(title: String, start: java.time.Instant, end: java.time.Instant, allDay: Boolean = false) =
        CalendarEvent(title = title, startDate = start, endDate = end, type = "CM", isAllDay = allDay)

    @Test
    fun `non overlapping events take the full width`() {
        val placed = AgendaLayout.place(listOf(event("B", at(10, 10), at(10, 12)), event("A", at(10, 8), at(10, 10))))
        assertEquals(listOf("A", "B"), placed.map { it.event.title })
        assertTrue(placed.all { it.column == 0 && it.columnCount == 1 })
    }

    @Test
    fun `overlapping events share columns and reuse freed ones`() {
        val placed = AgendaLayout.place(
            listOf(
                event("A", at(10, 8), at(10, 12)),
                event("B", at(10, 9), at(10, 10)),
                event("C", at(10, 10), at(10, 11)),
                event("D", at(10, 13), at(10, 14)),
            ),
        ).associateBy { it.event.title }

        assertEquals(0, placed.getValue("A").column)
        assertEquals(1, placed.getValue("B").column)
        assertEquals(1, placed.getValue("C").column)
        assertEquals(2, placed.getValue("A").columnCount)
        assertEquals(2, placed.getValue("C").columnCount)
        assertEquals(1, placed.getValue("D").columnCount)
    }

    @Test
    fun `all day events are excluded from the timeline`() {
        assertTrue(AgendaLayout.place(listOf(event("Férié", at(10, 0), at(10, 23), allDay = true))).isEmpty())
    }

    @Test
    fun `week days are monday to friday`() {
        val wednesday = LocalDate.of(2025, 3, 12)
        assertEquals((10..14).toList(), AgendaLayout.weekDays(wednesday, 0).map { it.dayOfMonth })
        assertEquals(17, AgendaLayout.weekDays(wednesday, 1).first().dayOfMonth)
        // Sunday still belongs to the week that started on Monday the 10th
        assertEquals(10, AgendaLayout.weekDays(LocalDate.of(2025, 3, 16), 0).first().dayOfMonth)
    }

    @Test
    fun `default day index is today on weekdays and monday on weekends`() {
        assertEquals(2, AgendaLayout.defaultDayIndex(LocalDate.of(2025, 3, 12)))
        assertEquals(0, AgendaLayout.defaultDayIndex(LocalDate.of(2025, 3, 15)))
    }

    @Test
    fun `events are filtered by Paris calendar day`() {
        // 23:30 Paris on the 10th is still the 10th even though it is 22:30 UTC
        val events = listOf(event("Late", at(10, 23, 30), at(10, 23, 45)), event("Tue", at(11, 8), at(11, 9)))
        assertEquals(listOf("Late"), AgendaLayout.eventsOn(LocalDate.of(2025, 3, 10), events).map { it.title })
    }
}
