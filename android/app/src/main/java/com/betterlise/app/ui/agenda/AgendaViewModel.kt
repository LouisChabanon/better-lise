package com.betterlise.app.ui.agenda

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.betterlise.app.data.api.CalendarEvent
import com.betterlise.app.data.api.Endpoints
import com.betterlise.app.data.auth.SessionRepository
import com.betterlise.app.data.cache.ResponseCache
import com.betterlise.app.data.settings.SettingsRepository
import com.betterlise.app.data.settings.UserSettings
import com.betterlise.app.domain.AgendaLayout
import com.betterlise.app.domain.PARIS
import com.betterlise.app.ui.components.Loadable
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.serialization.builtins.ListSerializer
import java.time.LocalDate

/** A one-shot scroll command; [nonce] makes two requests for the same target distinct. */
data class ScrollRequest(val target: Int, val nonce: Long)

data class AgendaUiState(
    val settings: UserSettings = UserSettings(),
    val events: Loadable<List<CalendarEvent>> = Loadable.Idle,
    val eventsByDay: Map<LocalDate, List<CalendarEvent>> = emptyMap(),
    val days: List<LocalDate>,
    val today: LocalDate,
    val todayIndex: Int,
    val visibleWeek: Int = todayIndex / 5,
    /** Programmatic scroll the week pager must perform ("Aujourd'hui"). */
    val pagerRequest: ScrollRequest? = null,
) {
    val weekCount: Int get() = days.size / 5
    /** Week of today, or the upcoming one on weekends. */
    val currentWeek: Int get() = todayIndex / 5
    val isShowingCurrentWeek: Boolean get() = visibleWeek == currentWeek
    val visibleWeekStart: LocalDate get() = days[(visibleWeek * 5).coerceAtMost(days.lastIndex)]

    fun eventsOn(day: LocalDate): List<CalendarEvent> = eventsByDay[day].orEmpty()
    fun indicesInWeek(week: Int): IntRange = (week * 5) until minOf(week * 5 + 5, days.size)
    fun hasAllDayEvents(week: Int): Boolean = indicesInWeek(week).any { index -> eventsOn(days[index]).any { it.isAllDay } }
}

class AgendaViewModel(
    private val session: SessionRepository,
    private val settingsRepository: SettingsRepository,
    private val cache: ResponseCache,
    today: () -> LocalDate = { LocalDate.now(PARIS) },
) : ViewModel() {
    private val _state: MutableStateFlow<AgendaUiState>
    val state: StateFlow<AgendaUiState>
    private var loadJob: Job? = null
    private var requestCounter = 0L

    init {
        val now = today()
        val days = AgendaLayout.schoolDays(now, WEEKS_AROUND, WEEKS_AROUND)
        _state = MutableStateFlow(AgendaUiState(days = days, today = now, todayIndex = AgendaLayout.initialIndex(days, now)))
        state = _state.asStateFlow()

        viewModelScope.launch {
            settingsRepository.settings
                .distinctUntilChanged { old, new ->
                    old.liseId == new.liseId && old.campus == new.campus && old.showRu == new.showRu
                }
                .collect { settings ->
                    _state.update { it.copy(settings = settings) }
                    refresh()
                }
        }
    }

    /** The user swiped the week pager. */
    fun pagerDidScroll(week: Int) = _state.update { current ->
        if (week !in 0 until current.weekCount || week == current.visibleWeek) current else current.copy(visibleWeek = week)
    }

    fun goToToday() = _state.update { current ->
        current.copy(visibleWeek = current.currentWeek, pagerRequest = nextRequest(current.currentWeek))
    }

    private fun nextRequest(target: Int) = ScrollRequest(target, ++requestCounter)

    fun refresh() {
        val settings = _state.value.settings
        if (!settings.hasValidLiseId) {
            _state.update { it.copy(events = Loadable.Idle, eventsByDay = emptyMap()) }
            return
        }
        loadJob?.cancel()
        loadJob = viewModelScope.launch {
            val key = "agenda-${settings.liseId}-${settings.campus.id}-${settings.showRu}"
            val cached = cache.load(key, EVENTS) ?: _state.value.events.value
            _state.update { it.withEvents(Loadable.Loading(cached)) }
            try {
                val response = session.sendPublic(Endpoints.agenda(settings.liseId, settings.campus.id, settings.showRu))
                cache.save(key, EVENTS, response.events)
                _state.update { it.withEvents(Loadable.Loaded(response.events)) }
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                _state.update { it.withEvents(Loadable.Failed(e.message ?: "Erreur", cached)) }
            }
        }
    }

    private fun AgendaUiState.withEvents(events: Loadable<List<CalendarEvent>>): AgendaUiState =
        if (events.value == this.events.value) {
            copy(events = events)
        } else {
            copy(events = events, eventsByDay = AgendaLayout.groupByDay(events.value.orEmpty()))
        }

    companion object {
        /** School weeks reachable by swiping on each side of the current week. */
        const val WEEKS_AROUND = 26
        private val EVENTS = ListSerializer(CalendarEvent.serializer())
    }
}
