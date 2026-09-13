package com.betterlise.app.ui.agenda

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.KeyboardArrowLeft
import androidx.compose.material.icons.automirrored.rounded.KeyboardArrowRight
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.betterlise.app.data.api.CalendarEvent
import com.betterlise.app.data.api.EventKind
import com.betterlise.app.domain.AgendaLayout
import com.betterlise.app.domain.PARIS
import com.betterlise.app.ui.components.EmptyState
import com.betterlise.app.ui.components.ErrorBanner
import com.betterlise.app.ui.components.errorMessage
import com.betterlise.app.ui.components.isLoading
import com.betterlise.app.ui.theme.AppTheme
import java.time.Instant
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.format.TextStyle
import java.util.Locale

private val FR = Locale.FRENCH
private val TIME = DateTimeFormatter.ofPattern("HH:mm", FR)
private const val START_HOUR = 7
private const val END_HOUR = 20
private val HOUR_HEIGHT = 64.dp
private val GUTTER = 44.dp

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AgendaScreen(viewModel: AgendaViewModel) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    var selectedEvent by remember { mutableStateOf<CalendarEvent?>(null) }

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        topBar = {
            TopAppBar(
                title = {
                    val first = state.weekDays.firstOrNull()
                    Text(
                        first?.let { "${it.month.getDisplayName(TextStyle.FULL, FR).replaceFirstChar(Char::titlecase)} ${it.year}" } ?: "Agenda",
                    )
                },
                navigationIcon = {
                    Row {
                        IconButton(onClick = { viewModel.shiftWeek(-1) }) {
                            Icon(Icons.AutoMirrored.Rounded.KeyboardArrowLeft, contentDescription = "Semaine précédente")
                        }
                        IconButton(onClick = { viewModel.shiftWeek(1) }) {
                            Icon(Icons.AutoMirrored.Rounded.KeyboardArrowRight, contentDescription = "Semaine suivante")
                        }
                    }
                },
                actions = {
                    if (state.events.isLoading) {
                        CircularProgressIndicator(Modifier.size(20.dp).padding(end = 4.dp), strokeWidth = 2.dp)
                        Spacer(Modifier.width(12.dp))
                    } else if (state.weekOffset != 0) {
                        TextButton(onClick = viewModel::goToToday) { Text("Aujourd'hui") }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.background),
            )
        },
    ) { padding ->
        Column(Modifier.padding(padding).fillMaxSize()) {
            if (!state.settings.hasValidLiseId) {
                EmptyState(
                    title = "Aucun identifiant",
                    message = "Renseigne ton identifiant Lise dans les réglages pour afficher ton emploi du temps.",
                    modifier = Modifier.padding(top = 80.dp),
                )
                return@Column
            }

            DayStrip(
                days = state.weekDays,
                selectedIndex = state.selectedDayIndex,
                hasEvents = { state.eventsOn(it).isNotEmpty() },
                onSelect = viewModel::selectDay,
            )
            state.events.errorMessage?.let {
                ErrorBanner(it, Modifier.padding(horizontal = 16.dp, vertical = 4.dp), onRetry = viewModel::refresh)
            }

            val pagerState = rememberPagerState(initialPage = state.selectedDayIndex) { state.weekDays.size }
            LaunchedEffect(state.selectedDayIndex, state.weekOffset) {
                if (pagerState.currentPage != state.selectedDayIndex) pagerState.animateScrollToPage(state.selectedDayIndex)
            }
            LaunchedEffect(pagerState.settledPage) { viewModel.selectDay(pagerState.settledPage) }

            PullToRefreshBox(isRefreshing = false, onRefresh = viewModel::refresh, modifier = Modifier.fillMaxSize()) {
                HorizontalPager(state = pagerState, modifier = Modifier.fillMaxSize()) { page ->
                    val day = state.weekDays.getOrNull(page) ?: return@HorizontalPager
                    DayTimeline(
                        day = day,
                        events = state.eventsOn(day),
                        isInitialLoad = state.events.isLoading && state.events.value == null,
                        onSelect = { selectedEvent = it },
                    )
                }
            }
        }
    }

    selectedEvent?.let { event ->
        EventDetailSheet(event = event, campusName = state.settings.campus.displayName, onDismiss = { selectedEvent = null })
    }
}

@Composable
private fun DayStrip(days: List<LocalDate>, selectedIndex: Int, hasEvents: (LocalDate) -> Boolean, onSelect: (Int) -> Unit) {
    val today = LocalDate.now(PARIS)
    Row(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        days.forEachIndexed { index, day ->
            val selected = index == selectedIndex
            val colors = MaterialTheme.colorScheme
            val content = when {
                selected -> colors.onPrimary
                day == today -> colors.primary
                else -> colors.onSurfaceVariant
            }
            Column(
                modifier = Modifier
                    .weight(1f)
                    .clip(RoundedCornerShape(14.dp))
                    .background(if (selected) colors.primary else colors.surface)
                    .clickable { onSelect(index) }
                    .padding(vertical = 8.dp)
                    .semantics {
                        this.selected = selected
                        contentDescription = day.format(DateTimeFormatter.ofPattern("EEEE d MMMM", FR))
                    },
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text(
                    day.dayOfWeek.getDisplayName(TextStyle.SHORT, FR).replaceFirstChar(Char::titlecase),
                    style = MaterialTheme.typography.labelMedium,
                    color = content,
                )
                Text("${day.dayOfMonth}", style = MaterialTheme.typography.titleLarge, color = content)
                Box(
                    Modifier
                        .padding(top = 2.dp)
                        .size(5.dp)
                        .background(
                            if (hasEvents(day)) (if (selected) colors.onPrimary else colors.primary) else Color.Transparent,
                            CircleShape,
                        ),
                )
            }
        }
    }
}

@Composable
private fun DayTimeline(day: LocalDate, events: List<CalendarEvent>, isInitialLoad: Boolean, onSelect: (CalendarEvent) -> Unit) {
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState())) {
        events.filter { it.isAllDay }.forEach { event ->
            val tone = AppTheme.colors.event(event.kind)
            Text(
                event.title,
                color = tone.foreground,
                fontWeight = FontWeight.SemiBold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 4.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(tone.background)
                    .clickable { onSelect(event) }
                    .padding(10.dp),
            )
        }

        BoxWithConstraints(
            Modifier
                .fillMaxWidth()
                .height(HOUR_HEIGHT * (END_HOUR - START_HOUR))
                .padding(end = 12.dp),
        ) {
            HourGrid()
            val columnsWidth = maxWidth - GUTTER
            AgendaLayout.place(events).forEach { placed ->
                val top = offsetFor(placed.event.startDate)
                val bottom = offsetFor(placed.event.endDate)
                val columnWidth = columnsWidth / placed.columnCount
                EventBlock(
                    event = placed.event,
                    compact = (bottom - top) < 44.dp,
                    modifier = Modifier
                        .offset(x = GUTTER + columnWidth * placed.column + 1.dp, y = top + 1.dp)
                        .width(columnWidth - 2.dp)
                        .height(maxOf(bottom - top - 2.dp, 22.dp))
                        .clickable { onSelect(placed.event) },
                )
            }
            if (day == LocalDate.now(PARIS)) {
                val y = offsetFor(Instant.now())
                Row(Modifier.offset(x = GUTTER - 4.dp, y = y - 4.dp), verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.size(8.dp).background(AppTheme.colors.danger.foreground, CircleShape))
                    HorizontalDivider(thickness = 1.5.dp, color = AppTheme.colors.danger.foreground)
                }
            }
            when {
                isInitialLoad -> CircularProgressIndicator(Modifier.align(Alignment.TopCenter).padding(top = 120.dp))
                events.isEmpty() -> Text(
                    "Rien de prévu 🎉",
                    style = MaterialTheme.typography.titleMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier
                        .align(Alignment.TopCenter)
                        .padding(top = 120.dp)
                        .background(MaterialTheme.colorScheme.surface, RoundedCornerShape(50))
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                )
            }
        }
    }
}

@Composable
private fun HourGrid() {
    Column {
        (START_HOUR until END_HOUR).forEach { hour ->
            Row(Modifier.height(HOUR_HEIGHT), verticalAlignment = Alignment.Top) {
                Text(
                    "${hour}h",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.width(GUTTER - 8.dp).offset(y = (-7).dp).padding(end = 4.dp),
                    textAlign = androidx.compose.ui.text.style.TextAlign.End,
                )
                HorizontalDivider(
                    modifier = Modifier.padding(start = 8.dp),
                    thickness = 0.5.dp,
                    color = MaterialTheme.colorScheme.outline.copy(alpha = 0.6f),
                )
            }
        }
    }
}

@Composable
private fun EventBlock(event: CalendarEvent, compact: Boolean, modifier: Modifier) {
    val tone = AppTheme.colors.event(event.kind)
    Row(
        modifier
            .clip(RoundedCornerShape(10.dp))
            .background(tone.background)
            .semantics(mergeDescendants = true) {},
    ) {
        Box(Modifier.width(3.dp).fillMaxSize().background(tone.foreground.copy(alpha = 0.5f)))
        Column(Modifier.padding(6.dp)) {
            Text(
                if (event.kind == EventKind.Restaurant) "🍽️ RU" else event.title,
                style = MaterialTheme.typography.labelMedium,
                fontWeight = FontWeight.SemiBold,
                color = tone.foreground,
                maxLines = if (compact) 1 else 2,
                overflow = TextOverflow.Ellipsis,
            )
            if (!compact) {
                Text(timeRange(event), style = MaterialTheme.typography.labelSmall, color = tone.foreground.copy(alpha = 0.85f))
                if (event.kind != EventKind.Restaurant) {
                    event.room?.let {
                        Text(it, style = MaterialTheme.typography.labelSmall, color = tone.foreground.copy(alpha = 0.85f), maxLines = 1)
                    }
                }
            }
        }
    }
}

internal fun timeRange(event: CalendarEvent): String =
    "${event.startDate.atZone(PARIS).format(TIME)} – ${event.endDate.atZone(PARIS).format(TIME)}"

private fun offsetFor(instant: Instant) = instant.atZone(PARIS).let { time ->
    val hours = time.hour + time.minute / 60f
    HOUR_HEIGHT * (hours.coerceIn(START_HOUR.toFloat(), END_HOUR.toFloat()) - START_HOUR)
}
