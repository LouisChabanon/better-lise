package com.betterlise.app.ui.absences

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.betterlise.app.data.api.AbsencesResponse
import com.betterlise.app.data.api.Endpoints
import com.betterlise.app.data.auth.SessionRepository
import com.betterlise.app.data.auth.SessionState
import com.betterlise.app.data.api.LiseHealth
import com.betterlise.app.data.cache.ResponseCache
import com.betterlise.app.data.health.LiseHealthMonitor
import com.betterlise.app.ui.loading.SyncState
import com.betterlise.app.ui.components.Loadable
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class AbsencesUiState(
    val isSignedIn: Boolean = false,
    val absences: Loadable<AbsencesResponse> = Loadable.Idle,
    val sync: SyncState = SyncState.Idle,
)

class AbsencesViewModel(
    private val session: SessionRepository,
    private val cache: ResponseCache,
    private val healthMonitor: LiseHealthMonitor,
    private val clock: () -> Long = System::currentTimeMillis,
) : ViewModel() {
    val health: StateFlow<LiseHealth?> = healthMonitor.health
    private val _state = MutableStateFlow(AbsencesUiState())
    val state: StateFlow<AbsencesUiState> = _state.asStateFlow()
    private var loadJob: Job? = null

    init {
        viewModelScope.launch {
            session.state.collect { sessionState ->
                val signedIn = sessionState is SessionState.SignedIn
                _state.value = AbsencesUiState(isSignedIn = signedIn)
                if (signedIn) refresh()
            }
        }
    }

    fun refresh() {
        loadJob?.cancel()
        loadJob = viewModelScope.launch {
            val cached = cache.load(CACHE_KEY, AbsencesResponse.serializer()) ?: _state.value.absences.value
            val startedAt = clock()
            val hasContent = cached != null
            _state.update { it.copy(absences = Loadable.Loading(cached), sync = SyncState.Syncing(startedAt, hasContent)) }
            launch { healthMonitor.refreshIfNeeded() }
            try {
                val response = session.send(Endpoints.absences())
                cache.save(CACHE_KEY, AbsencesResponse.serializer(), response)
                val finished = SyncState.Finished(startedAt, hasContent)
                _state.update { it.copy(absences = Loadable.Loaded(response), sync = finished) }
                completeSync(finished)
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                _state.update { it.copy(absences = Loadable.Failed(e.message ?: "Erreur", cached), sync = SyncState.Idle) }
            }
        }
    }

    /** Shows "Terminé" briefly, like the web app, before revealing the content. */
    private fun completeSync(finished: SyncState.Finished) {
        viewModelScope.launch {
            delay(SyncState.COMPLETION_DISPLAY_MS)
            _state.update { if (it.sync == finished) it.copy(sync = SyncState.Idle) else it }
        }
    }

    private companion object {
        const val CACHE_KEY = "absences"
    }
}
