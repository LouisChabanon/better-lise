package com.betterlise.app

import com.betterlise.app.data.api.CalendarEvent
import com.betterlise.app.domain.AgendaLayout
import com.betterlise.app.domain.PARIS
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
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
    fun `school days span whole weeks around today`() {
        val days = AgendaLayout.schoolDays(LocalDate.of(2025, 3, 12), weeksBefore = 1, weeksAfter = 1)

        assertEquals(15, days.size)
        assertEquals(listOf(3, 4, 5, 6, 7, 10, 11, 12, 13, 14, 17, 18, 19, 20, 21), days.map { it.dayOfMonth })
    }

    @Test
    fun `weekends center on the upcoming week`() {
        val days = AgendaLayout.schoolDays(LocalDate.of(2025, 3, 15), weeksBefore = 0, weeksAfter = 0)
        assertEquals(listOf(17, 18, 19, 20, 21), days.map { it.dayOfMonth })
    }

    @Test
    fun `initial index is today on weekdays and next monday on weekends`() {
        val days = AgendaLayout.schoolDays(LocalDate.of(2025, 3, 12), weeksBefore = 1, weeksAfter = 1)

        assertEquals(7, AgendaLayout.initialIndex(days, LocalDate.of(2025, 3, 12)))
        assertEquals(10, AgendaLayout.initialIndex(days, LocalDate.of(2025, 3, 15)))
        assertEquals(10, AgendaLayout.initialIndex(days, LocalDate.of(2025, 3, 16)))
    }

    @Test
    fun `events are grouped by Paris day and sorted`() {
        val grouped = AgendaLayout.groupByDay(
            listOf(event("Late", at(10, 23, 30), at(10, 23, 45)), event("Morning", at(10, 8), at(10, 9)), event("Tue", at(11, 8), at(11, 9))),
        )
        assertEquals(listOf("Morning", "Late"), grouped.getValue(LocalDate.of(2025, 3, 10)).map { it.title })
        assertEquals(listOf("Tue"), grouped.getValue(LocalDate.of(2025, 3, 11)).map { it.title })
    }

    @Test
    fun `events are filtered by Paris calendar day`() {
        // 23:30 Paris on the 10th is still the 10th even though it is 22:30 UTC
        val events = listOf(event("Late", at(10, 23, 30), at(10, 23, 45)), event("Tue", at(11, 8), at(11, 9)))
        assertEquals(listOf("Late"), AgendaLayout.eventsOn(LocalDate.of(2025, 3, 10), events).map { it.title })
    }

    @Test
    fun `event is past only once it has ended`() {
        val course = event("Méca", at(10, 8), at(10, 10))
        assertFalse(AgendaLayout.isPast(course, now = at(10, 7)))
        assertFalse(AgendaLayout.isPast(course, now = at(10, 9, 59)))
        assertTrue(AgendaLayout.isPast(course, now = at(10, 10)))
        assertTrue(AgendaLayout.isPast(course, now = at(11, 8)))
    }

    @Test
    fun `short time uses the hour label style`() {
        assertEquals("8h", AgendaLayout.shortTime(at(10, 8)))
        assertEquals("13h30", AgendaLayout.shortTime(at(10, 13, 30)))
        assertEquals("9h05", AgendaLayout.shortTime(at(10, 9, 5)))
    }

    @Test
    fun `hour labels near the current time give way`() {
        assertTrue(AgendaLayout.isHourLabelNearNow(21, at(10, 20, 47)))
        assertTrue(AgendaLayout.isHourLabelNearNow(10, at(10, 10, 14)))
        assertFalse(AgendaLayout.isHourLabelNearNow(10, at(10, 10, 15)))
        assertFalse(AgendaLayout.isHourLabelNearNow(21, at(10, 20, 45)))
    }
}
