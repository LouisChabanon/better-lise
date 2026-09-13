package com.betterlise.app.ui.absences

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.betterlise.app.data.api.AbsencesResponse
import com.betterlise.app.data.api.Endpoints
import com.betterlise.app.data.auth.SessionRepository
import com.betterlise.app.data.auth.SessionState
import com.betterlise.app.data.cache.ResponseCache
import com.betterlise.app.ui.components.Loadable
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class AbsencesUiState(
    val isSignedIn: Boolean = false,
    val absences: Loadable<AbsencesResponse> = Loadable.Idle,
)

class AbsencesViewModel(
    private val session: SessionRepository,
    private val cache: ResponseCache,
) : ViewModel() {
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
            _state.update { it.copy(absences = Loadable.Loading(cached)) }
            try {
                val response = session.send(Endpoints.absences())
                cache.save(CACHE_KEY, AbsencesResponse.serializer(), response)
                _state.update { it.copy(absences = Loadable.Loaded(response)) }
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                _state.update { it.copy(absences = Loadable.Failed(e.message ?: "Erreur", cached)) }
            }
        }
    }

    private companion object {
        const val CACHE_KEY = "absences"
    }
}
