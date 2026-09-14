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

    /**
     * Every school day (Monday–Friday) of the week of [reference] and the surrounding weeks.
     * On weekends the reference week is the upcoming one.
     */
    fun schoolDays(reference: LocalDate, weeksBefore: Int, weeksAfter: Int): List<LocalDate> {
        val anchor = if (reference.dayOfWeek.value >= 6) reference.with(TemporalAdjusters.next(DayOfWeek.MONDAY)) else reference
        val monday = anchor.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
        return (-weeksBefore..weeksAfter).flatMap { week ->
            (0L until 5L).map { day -> monday.plusWeeks(week.toLong()).plusDays(day) }
        }
    }

    /** Index of [today] in [days], or of the next school day when today is a weekend. */
    fun initialIndex(days: List<LocalDate>, today: LocalDate): Int =
        days.indexOfFirst { !it.isBefore(today) }.takeIf { it >= 0 } ?: (days.size - 1).coerceAtLeast(0)

    /** Events keyed by their Paris calendar day, sorted by start time. */
    fun groupByDay(events: List<CalendarEvent>): Map<LocalDate, List<CalendarEvent>> =
        events.groupBy { it.startDate.atZone(PARIS).toLocalDate() }.mapValues { (_, dayEvents) -> dayEvents.sortedBy { it.startDate } }

    /** An event is past once it has ended; the week view dims those. */
    fun isPast(event: CalendarEvent, now: Instant): Boolean = event.endDate <= now

    /** Whether the hour label of [hour] would collide with the current time shown in the gutter. */
    fun isHourLabelNearNow(hour: Int, now: Instant): Boolean = now.atZone(PARIS).let { time ->
        kotlin.math.abs(time.hour * 60 + time.minute - hour * 60) < 15
    }

    /** Paris time in the style of the hour gutter: "8h", "13h30". */
    fun shortTime(instant: Instant): String = instant.atZone(PARIS).let { time ->
        "${time.hour}h" + if (time.minute == 0) "" else "%02d".format(time.minute)
    }

    fun eventsOn(day: LocalDate, events: List<CalendarEvent>): List<CalendarEvent> =
        events.filter { it.startDate.atZone(PARIS).toLocalDate() == day }
}
