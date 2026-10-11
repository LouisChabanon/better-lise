package com.betterlise.app.ui.achievements

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.betterlise.app.data.api.Achievement
import com.betterlise.app.data.api.Endpoints
import com.betterlise.app.data.auth.SessionRepository
import com.betterlise.app.data.auth.SessionState
import com.betterlise.app.data.cache.ResponseCache
import com.betterlise.app.data.local.LocalStateRepository
import com.betterlise.app.domain.AchievementCelebration
import com.betterlise.app.domain.AchievementSummary
import com.betterlise.app.ui.components.Loadable
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.serialization.builtins.ListSerializer

data class AchievementsUiState(
    val achievements: Loadable<List<Achievement>> = Loadable.Idle,
    /** Unlocks waiting to be celebrated on this device. */
    val pendingCelebration: List<Achievement> = emptyList(),
) {
    val summary: AchievementSummary get() = AchievementSummary.of(achievements.value.orEmpty())
}

class AchievementsViewModel(
    private val session: SessionRepository,
    private val cache: ResponseCache,
    private val localState: LocalStateRepository,
) : ViewModel() {
    private val _state = MutableStateFlow(AchievementsUiState())
    val state: StateFlow<AchievementsUiState> = _state.asStateFlow()

    init {
        // Another account must never see the previous one's achievements
        viewModelScope.launch {
            session.state.collect { if (it is SessionState.SignedOut) _state.value = AchievementsUiState() }
        }
    }

    /** Unlocks earned achievements server-side and refreshes the list. */
    fun refresh() {
        val username = session.username ?: return
        viewModelScope.launch {
            val cached = _state.value.achievements.value ?: cache.load(CACHE_KEY, ACHIEVEMENTS)
            _state.update { it.copy(achievements = Loadable.Loading(cached)) }
            try {
                val response = session.send(Endpoints.achievements())
                cache.save(CACHE_KEY, ACHIEVEMENTS, response.achievements)
                val seen = localState.celebratedAchievements(username)
                    ?: AchievementCelebration.initialSeen(response.achievements, response.newlyUnlocked)
                localState.saveCelebratedAchievements(username, seen)
                _state.update {
                    it.copy(
                        achievements = Loadable.Loaded(response.achievements),
                        pendingCelebration = AchievementCelebration.pending(response.achievements, seen),
                    )
                }
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                _state.update { it.copy(achievements = Loadable.Failed(e.message ?: "Erreur", cached)) }
            }
        }
    }

    /** The banner was shown (or opened): don't celebrate these again. */
    fun markCelebrated() {
        val username = session.username ?: return
        val celebrated = _state.value.pendingCelebration.map { it.code }
        _state.update { it.copy(pendingCelebration = emptyList()) }
        viewModelScope.launch {
            val seen = localState.celebratedAchievements(username).orEmpty()
            localState.saveCelebratedAchievements(username, seen + celebrated)
        }
    }

    private companion object {
        const val CACHE_KEY = "achievements"
        val ACHIEVEMENTS = ListSerializer(Achievement.serializer())
    }
}
