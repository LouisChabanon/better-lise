package com.betterlise.app.ui.login

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.betterlise.app.data.auth.SessionRepository
import com.betterlise.app.data.settings.SettingsRepository
import com.betterlise.app.domain.LiseId
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class LoginUiState(
    val username: String = "",
    val password: String = "",
    val remember: Boolean = true,
    val isSubmitting: Boolean = false,
    val error: String? = null,
    val isSuccess: Boolean = false,
) {
    val canSubmit: Boolean get() = LiseId.isValid(username) && password.isNotEmpty() && !isSubmitting
}

class LoginViewModel(
    private val session: SessionRepository,
    private val settings: SettingsRepository,
) : ViewModel() {
    private val _state = MutableStateFlow(LoginUiState())
    val state: StateFlow<LoginUiState> = _state.asStateFlow()

    init {
        viewModelScope.launch {
            val saved = settings.settings.first().liseId
            _state.update { if (it.username.isEmpty()) it.copy(username = saved) else it }
        }
    }

    fun onUsernameChange(value: String) = _state.update { it.copy(username = value.trim(), error = null) }
    fun onPasswordChange(value: String) = _state.update { it.copy(password = value, error = null) }
    fun onRememberChange(value: Boolean) = _state.update { it.copy(remember = value) }

    fun submit() {
        val current = _state.value
        if (!current.canSubmit) return
        _state.update { it.copy(isSubmitting = true, error = null) }
        viewModelScope.launch {
            try {
                session.signIn(current.username, current.password, current.remember)
                if (!settings.settings.first().hasValidLiseId) settings.setLiseId(current.username)
                _state.update { it.copy(isSubmitting = false, password = "", isSuccess = true) }
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                _state.update { it.copy(isSubmitting = false, error = e.message ?: "Connexion impossible") }
            }
        }
    }
}
