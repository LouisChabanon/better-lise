package com.betterlise.app.domain

import com.betterlise.app.data.api.CalendarEvent
import java.time.DayOfWeek
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.temporal.TemporalAdjusters

val PARIS: ZoneId = ZoneId.of("Europe/Paris")

/** Column placement of a timed event inside a day timeline. */
data class PlacedEvent(val event: CalendarEvent, val column: Int, val columnCount: Int)

object AgendaLayout {
    /**
     * Groups overlapping events into clusters and assigns each event the first free column
     * of its cluster. Every event in a cluster shares the cluster's column count.
     */
    fun place(events: List<CalendarEvent>): List<PlacedEvent> {
        val sorted = events
            .filterNot { it.isAllDay }
            .sortedWith(compareBy<CalendarEvent> { it.startDate }.thenBy { it.endDate })

        val placed = mutableListOf<PlacedEvent>()
        val cluster = mutableListOf<Pair<CalendarEvent, Int>>()
        val columnEnds = mutableListOf<Instant>()
        var clusterEnd = Instant.MIN

        fun flush() {
            val count = maxOf(columnEnds.size, 1)
            cluster.forEach { (event, column) -> placed += PlacedEvent(event, column, count) }
            cluster.clear()
            columnEnds.clear()
        }

        for (event in sorted) {
            if (cluster.isNotEmpty() && event.startDate >= clusterEnd) flush()
            val free = columnEnds.indexOfFirst { it <= event.startDate }
            if (free >= 0) {
                columnEnds[free] = event.endDate
                cluster += event to free
            } else {
                columnEnds += event.endDate
                cluster += event to columnEnds.lastIndex
            }
            if (event.endDate > clusterEnd) clusterEnd = event.endDate
        }
        flush()
        return placed
    }

    /** Monday–Friday of the week containing [today], shifted by [weekOffset] weeks. */
    fun weekDays(today: LocalDate, weekOffset: Int): List<LocalDate> {
        val monday = today.plusWeeks(weekOffset.toLong()).with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
        return (0L until 5L).map { monday.plusDays(it) }
    }

    fun eventsOn(day: LocalDate, events: List<CalendarEvent>): List<CalendarEvent> =
        events.filter { it.startDate.atZone(PARIS).toLocalDate() == day }

    /** Index (0 = Monday) of [today] in the work week, or 0 on weekends. */
    fun defaultDayIndex(today: LocalDate): Int =
        today.dayOfWeek.value.let { if (it in 1..5) it - 1 else 0 }
}
