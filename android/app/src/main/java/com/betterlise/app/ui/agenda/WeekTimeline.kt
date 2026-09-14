package com.betterlise.app.ui.agenda

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.LocalIndication
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.wrapContentWidth
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.betterlise.app.data.api.CalendarEvent
import com.betterlise.app.data.api.EventKind
import com.betterlise.app.domain.AgendaLayout
import com.betterlise.app.domain.PARIS
import com.betterlise.app.ui.theme.AppTheme
import kotlinx.coroutines.delay
import java.time.Instant
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.format.TextStyle
import java.util.Locale

internal val FR: Locale = Locale.FRENCH
private val TIME = DateTimeFormatter.ofPattern("HH:mm", FR)
private val HEADER_LABEL = DateTimeFormatter.ofPattern("EEEE d MMMM yyyy", FR)
private const val START_HOUR = 7
private const val END_HOUR = 20
private const val HOURS = END_HOUR - START_HOUR
private const val DAYS_PER_WEEK = 5
/** Below this, the week scrolls vertically instead of squeezing the hours further. */
private val MIN_HOUR_HEIGHT = 44.dp
/** Wide enough for the current time capsule ("13h45"). */
private val GUTTER = 32.dp
/** Keeps Friday's events off the screen edge. */
private val TRAILING_INSET = 4.dp
/** Room for the first hour label, drawn above its grid line. */
private val GRID_TOP = 8.dp
private const val HAIRLINE_ALPHA = 0.35f
private const val PAST_ALPHA = 0.55f
private const val TODAY_TINT_ALPHA = 0.05f

/** Monday–Friday on one screen: the hours fit the available height, each day is a column. */
@Composable
internal fun WeekTimeline(
    days: List<LocalDate>,
    today: LocalDate,
    eventsOn: (LocalDate) -> List<CalendarEvent>,
    showAllDayRow: Boolean,
    isInitialLoad: Boolean,
    onSelect: (CalendarEvent) -> Unit,
) {
    Column(Modifier.fillMaxSize()) {
        DayHeaderRow(days, today)
        if (showAllDayRow) AllDayRow(days, eventsOn, onSelect)
        HorizontalDivider(thickness = 0.5.dp, color = hairlineColor())

        BoxWithConstraints(Modifier.fillMaxWidth().weight(1f)) {
            val hourHeight = maxOf(MIN_HOUR_HEIGHT, (maxHeight - GRID_TOP) / HOURS)
            val dayWidth = (maxWidth - GUTTER - TRAILING_INSET) / DAYS_PER_WEEK
            val todayIndex = days.indexOf(today)
            val now = rememberNow()

            Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState())) {
                Box(Modifier.padding(top = GRID_TOP).fillMaxWidth().height(hourHeight * HOURS)) {
                    if (todayIndex >= 0) TodayTint(x = GUTTER + dayWidth * todayIndex, dayWidth)
                    HourGrid(hourHeight, now = now.takeIf { todayIndex >= 0 })
                    days.forEachIndexed { index, day ->
                        DayEvents(eventsOn(day), x = GUTTER + dayWidth * index, dayWidth, hourHeight, now, onSelect)
                    }
                    if (todayIndex >= 0) NowIndicator(now, todayX = GUTTER + dayWidth * todayIndex, dayWidth, hourHeight)
                }
            }

            when {
                isInitialLoad -> CircularProgressIndicator(Modifier.align(Alignment.Center))
                days.all { eventsOn(it).isEmpty() } -> Text(
                    "Rien de prévu 🎉",
                    style = MaterialTheme.typography.titleMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier
                        .align(Alignment.Center)
                        .background(MaterialTheme.colorScheme.surface, RoundedCornerShape(50))
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                )
            }
        }
    }
}

@Composable
private fun DayHeaderRow(days: List<LocalDate>, today: LocalDate) {
    val colors = MaterialTheme.colorScheme
    Row(Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
        Spacer(Modifier.width(GUTTER))
        days.forEach { day ->
            val isToday = day == today
            val isPastDay = day.isBefore(today)
            Column(
                modifier = Modifier
                    .weight(1f)
                    .testTag("dayHeader")
                    .semantics(mergeDescendants = true) {
                        selected = isToday
                        contentDescription = day.format(HEADER_LABEL)
                    },
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text(
                    day.dayOfWeek.getDisplayName(TextStyle.SHORT, FR).removeSuffix(".").replaceFirstChar(Char::titlecase),
                    style = MaterialTheme.typography.labelSmall,
                    fontWeight = FontWeight.SemiBold,
                    color = when {
                        isToday -> colors.primary
                        isPastDay -> colors.onSurfaceVariant.copy(alpha = 0.7f)
                        else -> colors.onSurfaceVariant
                    },
                )
                Box(
                    Modifier
                        .padding(top = 2.dp)
                        .size(30.dp)
                        .background(if (isToday) colors.primary else colors.background, CircleShape),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        "${day.dayOfMonth}",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                        color = when {
                            isToday -> colors.onPrimary
                            isPastDay -> colors.onSurfaceVariant
                            else -> colors.onSurface
                        },
                    )
                }
            }
        }
        Spacer(Modifier.width(TRAILING_INSET))
    }
}

@Composable
private fun AllDayRow(days: List<LocalDate>, eventsOn: (LocalDate) -> List<CalendarEvent>, onSelect: (CalendarEvent) -> Unit) {
    Row(Modifier.fillMaxWidth().padding(bottom = 4.dp)) {
        Spacer(Modifier.width(GUTTER))
        days.forEach { day ->
            Column(Modifier.weight(1f).padding(horizontal = 1.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                eventsOn(day).filter { it.isAllDay }.forEach { event ->
                    val tone = AppTheme.colors.event(event.kind)
                    Text(
                        event.title,
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.SemiBold,
                        color = tone.foreground,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(6.dp))
                            .background(tone.background)
                            .clickable { onSelect(event) }
                            .padding(horizontal = 4.dp, vertical = 2.dp),
                    )
                }
            }
        }
        Spacer(Modifier.width(TRAILING_INSET))
    }
}

/** [now] is set when the week shows today: labels next to the current time give way to it. */
@Composable
private fun HourGrid(hourHeight: Dp, now: Instant?) {
    Column {
        (START_HOUR until END_HOUR).forEach { hour ->
            Row(Modifier.height(hourHeight), verticalAlignment = Alignment.Top) {
                Text(
                    if (hour == START_HOUR || (now != null && AgendaLayout.isHourLabelNearNow(hour, now))) "" else "${hour}h",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.End,
                    maxLines = 1,
                    modifier = Modifier.width(GUTTER).offset(y = (-7).dp).padding(end = 6.dp),
                )
                // The first line would double the hairline under the header
                HorizontalDivider(Modifier.padding(end = TRAILING_INSET), thickness = 0.5.dp, color = if (hour == START_HOUR) Color.Transparent else hairlineColor())
            }
        }
    }
}

@Composable
private fun hairlineColor() = MaterialTheme.colorScheme.outline.copy(alpha = HAIRLINE_ALPHA)

/** Soft wash behind today's column, anchoring the eye without drawing lines. */
@Composable
private fun TodayTint(x: Dp, dayWidth: Dp) {
    Box(
        Modifier
            .offset(x = x)
            .width(dayWidth)
            .fillMaxHeight()
            .background(MaterialTheme.colorScheme.primary.copy(alpha = TODAY_TINT_ALPHA)),
    )
}

/** The current instant, refreshed at every minute boundary. */
@Composable
private fun rememberNow(): Instant {
    val now by produceState(Instant.now()) {
        while (true) {
            delay(60_000 - System.currentTimeMillis() % 60_000)
            value = Instant.now()
        }
    }
    return now
}

/** Timed events of one day, sharing the day column when they overlap. */
@Composable
private fun DayEvents(events: List<CalendarEvent>, x: Dp, dayWidth: Dp, hourHeight: Dp, now: Instant, onSelect: (CalendarEvent) -> Unit) {
    AgendaLayout.place(events).forEach { placed ->
        val top = offsetFor(placed.event.startDate, hourHeight)
        val bottom = offsetFor(placed.event.endDate, hourHeight)
        val columnWidth = dayWidth / placed.columnCount
        val height = maxOf(bottom - top - 2.dp, 18.dp)
        EventBlock(
            event = placed.event,
            height = height,
            isPast = AgendaLayout.isPast(placed.event, now),
            onClick = { onSelect(placed.event) },
            modifier = Modifier
                .offset(x = x + columnWidth * placed.column + 1.5.dp, y = top + 1.dp)
                .width(columnWidth - 3.dp)
                .height(height),
        )
    }
}

/** Faint line across the week, strong on today's column, and the time in the gutter. */
@Composable
private fun NowIndicator(now: Instant, todayX: Dp, dayWidth: Dp, hourHeight: Dp) {
    if (now.atZone(PARIS).hour !in START_HOUR until END_HOUR) return
    val color = AppTheme.colors.danger.foreground
    val background = MaterialTheme.colorScheme.background
    val y = offsetFor(now, hourHeight)

    // Time first so its background never covers the dot
    Box(Modifier.offset(y = y - 10.dp).width(GUTTER - 3.dp).height(20.dp), contentAlignment = Alignment.CenterEnd) {
        Text(
            AgendaLayout.shortTime(now),
            fontSize = 9.sp,
            fontWeight = FontWeight.Bold,
            color = color,
            maxLines = 1,
            softWrap = false,
            modifier = Modifier
                .wrapContentWidth(unbounded = true)
                .background(background, RoundedCornerShape(50))
                .padding(horizontal = 1.dp),
        )
    }
    Box(Modifier.offset(x = GUTTER, y = y - 0.5.dp).width(dayWidth * DAYS_PER_WEEK).height(1.dp).background(color.copy(alpha = 0.25f)))
    Box(Modifier.offset(x = todayX, y = y - 0.75.dp).width(dayWidth).height(1.5.dp).background(color))
    Box(
        Modifier
            .offset(x = todayX - 5.5.dp, y = y - 5.5.dp)
            .size(11.dp)
            .background(background, CircleShape)
            .padding(1.5.dp)
            .background(color, CircleShape),
    )
}

/** Narrow week-column block: title first, then the start time and room when the block is tall enough. */
@Composable
private fun EventBlock(event: CalendarEvent, height: Dp, isPast: Boolean, onClick: () -> Unit, modifier: Modifier) {
    val tone = AppTheme.colors.event(event.kind)
    val isRestaurant = event.kind == EventKind.Restaurant
    val shape = RoundedCornerShape(8.dp)
    val interactions = remember { MutableInteractionSource() }
    val isPressed by interactions.collectIsPressedAsState()
    val scale by animateFloatAsState(if (isPressed) 0.97f else 1f, tween(150), label = "press")

    Column(
        modifier
            .graphicsLayer {
                scaleX = scale
                scaleY = scale
            }
            // Opaque backdrop so the grid does not show through dimmed blocks
            .background(MaterialTheme.colorScheme.background, shape)
            .graphicsLayer { alpha = if (isPast) PAST_ALPHA else 1f }
            .clip(shape)
            .background(tone.background)
            .border(0.5.dp, tone.foreground.copy(alpha = 0.15f), shape)
            .clickable(interactionSource = interactions, indication = LocalIndication.current, onClick = onClick)
            .testTag("eventBlock")
            .semantics(mergeDescendants = true) { contentDescription = "${event.title}, ${timeRange(event)}" }
            .padding(horizontal = 4.dp, vertical = 3.dp),
    ) {
        Text(
            if (isRestaurant) "🍽️ RU" else event.title,
            style = MaterialTheme.typography.labelSmall,
            fontWeight = FontWeight.SemiBold,
            color = tone.foreground,
            maxLines = if (height < 36.dp) 1 else 3,
            overflow = TextOverflow.Ellipsis,
        )
        if (height >= 48.dp) {
            Text(AgendaLayout.shortTime(event.startDate), style = MaterialTheme.typography.labelSmall, color = tone.foreground.copy(alpha = 0.8f), maxLines = 1)
        }
        if (!isRestaurant && height >= 64.dp) {
            event.room?.let {
                Text(it, style = MaterialTheme.typography.labelSmall, color = tone.foreground.copy(alpha = 0.8f), maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
        }
    }
}

internal fun timeRange(event: CalendarEvent): String =
    "${event.startDate.atZone(PARIS).format(TIME)} – ${event.endDate.atZone(PARIS).format(TIME)}"

private fun offsetFor(instant: Instant, hourHeight: Dp) = instant.atZone(PARIS).let { time ->
    val hours = time.hour + time.minute / 60f
    hourHeight * (hours.coerceIn(START_HOUR.toFloat(), END_HOUR.toFloat()) - START_HOUR)
}
