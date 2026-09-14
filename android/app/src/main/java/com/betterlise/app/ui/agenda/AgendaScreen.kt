package com.betterlise.app.ui.agenda

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
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
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Modifier
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.betterlise.app.data.api.CalendarEvent
import com.betterlise.app.ui.components.EmptyState
import com.betterlise.app.ui.components.ErrorBanner
import com.betterlise.app.ui.components.errorMessage
import com.betterlise.app.ui.components.isLoading
import kotlinx.coroutines.flow.drop
import java.time.format.TextStyle
import kotlin.math.abs

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
                    val monday = state.visibleWeekStart
                    Text("${monday.month.getDisplayName(TextStyle.FULL, FR).replaceFirstChar(Char::titlecase)} ${monday.year}")
                },
                actions = {
                    if (state.events.isLoading) {
                        CircularProgressIndicator(Modifier.size(20.dp).padding(end = 4.dp), strokeWidth = 2.dp)
                        Spacer(Modifier.width(12.dp))
                    } else if (!state.isShowingCurrentWeek) {
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

            state.events.errorMessage?.let {
                ErrorBanner(it, Modifier.padding(horizontal = 16.dp, vertical = 4.dp), onRetry = viewModel::refresh)
            }
            WeekPager(state, viewModel, onSelect = { selectedEvent = it })
        }
    }

    selectedEvent?.let { event ->
        EventDetailSheet(event = event, campusName = state.settings.campus.displayName, onDismiss = { selectedEvent = null })
    }
}

/** One page per school week (Monday–Friday), like the web agenda. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun WeekPager(state: AgendaUiState, viewModel: AgendaViewModel, onSelect: (CalendarEvent) -> Unit) {
    val pagerState = rememberPagerState(initialPage = state.visibleWeek) { state.weekCount }
    val haptics = LocalHapticFeedback.current

    // User swipes are reported once the page settles; "Aujourd'hui" comes back as a request
    LaunchedEffect(pagerState) {
        snapshotFlow { pagerState.settledPage }.collect(viewModel::pagerDidScroll)
    }
    LaunchedEffect(pagerState) {
        snapshotFlow { pagerState.settledPage }.drop(1).collect {
            haptics.performHapticFeedback(HapticFeedbackType.SegmentTick)
        }
    }
    LaunchedEffect(state.pagerRequest) {
        val request = state.pagerRequest ?: return@LaunchedEffect
        if (abs(request.target - pagerState.currentPage) <= 1) {
            pagerState.animateScrollToPage(request.target)
        } else {
            pagerState.scrollToPage(request.target)
        }
    }

    PullToRefreshBox(isRefreshing = false, onRefresh = viewModel::refresh, modifier = Modifier.fillMaxSize()) {
        HorizontalPager(
            state = pagerState,
            beyondViewportPageCount = 1,
            modifier = Modifier.fillMaxSize().testTag("weekPager"),
        ) { week ->
            WeekTimeline(
                days = state.indicesInWeek(week).map { state.days[it] },
                today = state.today,
                eventsOn = state::eventsOn,
                showAllDayRow = state.hasAllDayEvents(week),
                isInitialLoad = state.events.isLoading && state.events.value == null,
                onSelect = onSelect,
            )
        }
    }
}
