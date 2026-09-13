package com.betterlise.app.ui.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.betterlise.app.data.api.Endpoints
import com.betterlise.app.data.auth.SessionRepository
import com.betterlise.app.data.auth.SessionState
import com.betterlise.app.data.cache.ResponseCache
import com.betterlise.app.data.settings.Campus
import com.betterlise.app.data.settings.Promo
import com.betterlise.app.data.settings.SettingsRepository
import com.betterlise.app.data.settings.UserSettings
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

data class SettingsUiState(
    val settings: UserSettings = UserSettings(),
    val username: String? = null,
    val syncError: String? = null,
)

class SettingsViewModel(
    private val session: SessionRepository,
    private val repository: SettingsRepository,
    private val cache: ResponseCache,
) : ViewModel() {
    private val syncError = MutableStateFlow<String?>(null)

    val state: StateFlow<SettingsUiState> = combine(repository.settings, session.state, syncError) { settings, sessionState, error ->
        SettingsUiState(settings, (sessionState as? SessionState.SignedIn)?.username, error)
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), SettingsUiState())

    fun setLiseId(value: String) = viewModelScope.launch { repository.setLiseId(value) }
    fun setShowRu(value: Boolean) = viewModelScope.launch { repository.setShowRu(value) }

    fun setCampus(value: Campus) = viewModelScope.launch {
        repository.setCampus(value)
        syncProfile(tbk = value.id, promo = state.value.settings.promo?.id)
    }

    fun setPromo(value: Promo?) = viewModelScope.launch {
        repository.setPromo(value)
        syncProfile(tbk = state.value.settings.campus.id, promo = value?.id)
    }

    fun signOut() = viewModelScope.launch {
        session.signOut()
        cache.clear()
    }

    /** Campus and promo are also stored server-side for new-grade notifications. */
    private suspend fun syncProfile(tbk: String, promo: String?) {
        if (session.username == null) return
        syncError.value = runCatching { session.send(Endpoints.updateProfile(promo, tbk)) }
            .exceptionOrNull()
            ?.let { "Synchronisation impossible : ${it.message}" }
    }
}
