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
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.serialization.builtins.ListSerializer
import java.time.LocalDate

data class AgendaUiState(
    val settings: UserSettings = UserSettings(),
    val events: Loadable<List<CalendarEvent>> = Loadable.Idle,
    val weekOffset: Int = 0,
    val selectedDayIndex: Int = 0,
    val weekDays: List<LocalDate> = emptyList(),
) {
    fun eventsOn(day: LocalDate) = AgendaLayout.eventsOn(day, events.value.orEmpty())
}

class AgendaViewModel(
    private val session: SessionRepository,
    private val settingsRepository: SettingsRepository,
    private val cache: ResponseCache,
    private val today: () -> LocalDate = { LocalDate.now(PARIS) },
) : ViewModel() {
    private val _state = MutableStateFlow(
        AgendaUiState(
            selectedDayIndex = AgendaLayout.defaultDayIndex(today()),
            weekDays = AgendaLayout.weekDays(today(), 0),
        ),
    )
    val state: StateFlow<AgendaUiState> = _state.asStateFlow()
    private var loadJob: Job? = null

    init {
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

    fun refresh() {
        val settings = _state.value.settings
        if (!settings.hasValidLiseId) {
            _state.update { it.copy(events = Loadable.Idle) }
            return
        }
        loadJob?.cancel()
        loadJob = viewModelScope.launch {
            val key = "agenda-${settings.liseId}-${settings.campus.id}-${settings.showRu}"
            val cached = cache.load(key, EVENTS) ?: _state.value.events.value
            _state.update { it.copy(events = Loadable.Loading(cached)) }
            try {
                val response = session.sendPublic(Endpoints.agenda(settings.liseId, settings.campus.id, settings.showRu))
                cache.save(key, EVENTS, response.events)
                _state.update { it.copy(events = Loadable.Loaded(response.events)) }
            } catch (e: kotlinx.coroutines.CancellationException) {
                throw e
            } catch (e: Exception) {
                _state.update { it.copy(events = Loadable.Failed(e.message ?: "Erreur", cached)) }
            }
        }
    }

    fun selectDay(index: Int) = _state.update { it.copy(selectedDayIndex = index.coerceIn(0, 4)) }

    fun shiftWeek(delta: Int) = _state.update {
        val offset = it.weekOffset + delta
        it.copy(
            weekOffset = offset,
            weekDays = AgendaLayout.weekDays(today(), offset),
            selectedDayIndex = if (delta > 0) 0 else 4,
        )
    }

    fun goToToday() = _state.update {
        it.copy(
            weekOffset = 0,
            weekDays = AgendaLayout.weekDays(today(), 0),
            selectedDayIndex = AgendaLayout.defaultDayIndex(today()),
        )
    }

    private companion object {
        val EVENTS = ListSerializer(CalendarEvent.serializer())
    }
}
