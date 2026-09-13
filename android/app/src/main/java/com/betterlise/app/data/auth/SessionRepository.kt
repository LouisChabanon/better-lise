package com.betterlise.app.data.auth

import com.betterlise.app.data.api.ApiClient
import com.betterlise.app.data.api.ApiError
import com.betterlise.app.data.api.Endpoint
import com.betterlise.app.data.api.Endpoints
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

sealed interface SessionState {
    data object SignedOut : SessionState
    data class SignedIn(val username: String) : SessionState
}

/** Owns the Better Lise session: token, optional saved credentials and silent re-login. */
class SessionRepository(
    private val client: ApiClient,
    private val secureStore: SecureStore,
) {
    private val reauthMutex = Mutex()

    private val _state = MutableStateFlow(initialState())
    val state: StateFlow<SessionState> = _state.asStateFlow()

    val username: String? get() = (state.value as? SessionState.SignedIn)?.username

    private fun initialState(): SessionState {
        val username = secureStore.get(KEY_USERNAME)
        return if (secureStore.get(KEY_TOKEN) != null && username != null) {
            SessionState.SignedIn(username)
        } else {
            SessionState.SignedOut
        }
    }

    suspend fun signIn(username: String, password: String, remember: Boolean) {
        val response = client.send(Endpoints.login(username, password), token = null)
        secureStore.set(KEY_TOKEN, response.token)
        secureStore.set(KEY_USERNAME, response.username)
        if (remember) secureStore.set(KEY_PASSWORD, password) else secureStore.remove(KEY_PASSWORD)
        _state.value = SessionState.SignedIn(response.username)
    }

    suspend fun signOut() {
        secureStore.get(KEY_TOKEN)?.let { token ->
            runCatching { client.send(Endpoints.logout(), token) }
        }
        clearSession()
    }

    /**
     * Sends an authenticated request. On an expired session, logs in again once with the
     * saved credentials and retries; otherwise signs the user out and rethrows.
     */
    suspend fun <T> send(endpoint: Endpoint<T>): T {
        val token = secureStore.get(KEY_TOKEN) ?: run {
            clearSession()
            throw ApiError.Unauthorized
        }
        return try {
            client.send(endpoint, token)
        } catch (error: ApiError) {
            if (!error.requiresReauthentication) throw error
            val newToken = reauthenticate(expiredToken = token) ?: run {
                clearSession()
                throw error
            }
            client.send(endpoint, newToken)
        }
    }

    suspend fun <T> sendPublic(endpoint: Endpoint<T>): T = client.send(endpoint, token = null)

    // Serialised so parallel requests hitting an expired session trigger a single login
    private suspend fun reauthenticate(expiredToken: String): String? = reauthMutex.withLock {
        secureStore.get(KEY_TOKEN)?.takeIf { it != expiredToken }?.let { return it }
        val username = secureStore.get(KEY_USERNAME) ?: return null
        val password = secureStore.get(KEY_PASSWORD) ?: return null
        val response = runCatching { client.send(Endpoints.login(username, password), token = null) }
            .getOrNull() ?: return null
        secureStore.set(KEY_TOKEN, response.token)
        response.token
    }

    private fun clearSession() {
        listOf(KEY_TOKEN, KEY_USERNAME, KEY_PASSWORD).forEach(secureStore::remove)
        _state.value = SessionState.SignedOut
    }

    companion object {
        const val KEY_TOKEN = "session.token"
        const val KEY_USERNAME = "session.username"
        const val KEY_PASSWORD = "session.password"
    }
}
