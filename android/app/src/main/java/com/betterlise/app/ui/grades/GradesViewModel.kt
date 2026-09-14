package com.betterlise.app.ui.grades

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.betterlise.app.data.api.Endpoints
import com.betterlise.app.data.api.Grade
import com.betterlise.app.data.api.GradeStats
import com.betterlise.app.data.auth.SessionRepository
import com.betterlise.app.data.auth.SessionState
import com.betterlise.app.data.api.LiseHealth
import com.betterlise.app.data.cache.ResponseCache
import com.betterlise.app.data.health.LiseHealthMonitor
import com.betterlise.app.ui.loading.SyncState
import com.betterlise.app.domain.GradeSorting
import com.betterlise.app.ui.components.Loadable
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.serialization.builtins.ListSerializer

data class GradesUiState(
    val isSignedIn: Boolean = false,
    val grades: Loadable<List<Grade>> = Loadable.Idle,
    val query: String = "",
    val selected: Grade? = null,
    val stats: Loadable<GradeStats> = Loadable.Idle,
    val sync: SyncState = SyncState.Idle,
    /** Reveal mode: new grade currently being revealed. */
    val revealing: Grade? = null,
) {
    val visibleGrades: List<Grade>
        get() {
            val all = grades.value.orEmpty()
            val q = query.trim()
            if (q.isEmpty()) return all
            return all.filter { it.libelle.contains(q, ignoreCase = true) || it.code.contains(q, ignoreCase = true) }
        }

    val unreadCount: Int get() = grades.value.orEmpty().count { it.isUnread }
}

class GradesViewModel(
    private val session: SessionRepository,
    private val cache: ResponseCache,
    private val healthMonitor: LiseHealthMonitor,
    private val clock: () -> Long = System::currentTimeMillis,
) : ViewModel() {
    val health: StateFlow<LiseHealth?> = healthMonitor.health
    private val _state = MutableStateFlow(GradesUiState())
    val state: StateFlow<GradesUiState> = _state.asStateFlow()
    private var loadJob: Job? = null

    init {
        viewModelScope.launch {
            session.state.collect { sessionState ->
                val signedIn = sessionState is SessionState.SignedIn
                _state.update { GradesUiState(isSignedIn = signedIn) }
                if (signedIn) refresh()
            }
        }
    }

    fun refresh() {
        loadJob?.cancel()
        loadJob = viewModelScope.launch {
            val cached = cache.load(CACHE_KEY, GRADES) ?: _state.value.grades.value
            val startedAt = clock()
            val hasContent = !cached.isNullOrEmpty()
            _state.update { it.copy(grades = Loadable.Loading(cached), sync = SyncState.Syncing(startedAt, hasContent)) }
            launch { healthMonitor.refreshIfNeeded() }
            try {
                val sorted = GradeSorting.sorted(session.send(Endpoints.grades(refresh = true)).grades)
                cache.save(CACHE_KEY, GRADES, sorted)
                val finished = SyncState.Finished(startedAt, hasContent)
                _state.update { it.copy(grades = Loadable.Loaded(sorted), sync = finished) }
                completeSync(finished)
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                _state.update { it.copy(grades = Loadable.Failed(e.message ?: "Erreur", cached), sync = SyncState.Idle) }
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

    fun onQueryChange(query: String) = _state.update { it.copy(query = query) }

    /** Reveal mode hides new grades until they are revealed; otherwise the detail opens right away. */
    fun onGradeTapped(grade: Grade, revealMode: Boolean) {
        if (revealMode && grade.isUnread) {
            _state.update { it.copy(revealing = grade) }
        } else {
            open(grade)
        }
    }

    /** The reel stopped: the grade is now seen. */
    fun onRevealed() {
        _state.value.revealing?.let(::markOpened)
    }

    /** The reveal finished: show the grade detail. */
    fun finishReveal() {
        val grade = _state.value.revealing ?: return
        _state.update { it.copy(revealing = null) }
        open(grade)
    }

    fun dismissReveal() = _state.update { it.copy(revealing = null) }

    /** Reveal mode replay: hides the grade again, rolling back if the server fails. */
    fun markNew(grade: Grade) {
        val previous = _state.value.grades.value ?: return
        // The caller may hold a stale copy: trust the current list
        if (previous.none { it.code == grade.code && !it.isUnread }) return
        val updated = GradeSorting.sorted(previous.map { if (it.code == grade.code) it.copy(isNew = true) else it })
        _state.update { it.copy(grades = Loadable.Loaded(updated), selected = null, stats = Loadable.Idle) }
        viewModelScope.launch {
            try {
                session.send(Endpoints.markGradeNew(grade.code))
                cache.save(CACHE_KEY, GRADES, updated)
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                _state.update { it.copy(grades = Loadable.Failed(e.message ?: "Erreur", previous)) }
            }
        }
    }

    fun open(grade: Grade) {
        _state.update { it.copy(selected = grade, stats = Loadable.Loading(null)) }
        loadStats(grade)
        markOpened(grade)
    }

    fun dismissDetail() = _state.update { it.copy(selected = null, stats = Loadable.Idle) }

    fun loadStats(grade: Grade) {
        viewModelScope.launch {
            _state.update { it.copy(stats = Loadable.Loading(null)) }
            val result = runCatching { session.send(Endpoints.gradeStats(grade.code)) }
            _state.update { current ->
                if (current.selected?.code != grade.code) return@update current
                current.copy(
                    stats = result.fold(
                        onSuccess = { Loadable.Loaded(it) },
                        onFailure = { Loadable.Failed(it.message ?: "Erreur", null) },
                    ),
                )
            }
        }
    }

    /** Optimistically clears the "new" flag, rolling back with an error if the server call fails. */
    private fun markOpened(grade: Grade) {
        val previous = _state.value.grades.value ?: return
        if (previous.none { it.code == grade.code && it.isUnread }) return
        val updated = previous.map { if (it.code == grade.code) it.copy(isNew = false) else it }
        _state.update { it.copy(grades = Loadable.Loaded(updated)) }
        viewModelScope.launch {
            try {
                session.send(Endpoints.markGradeOpened(grade.code))
                cache.save(CACHE_KEY, GRADES, updated)
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                _state.update { it.copy(grades = Loadable.Failed(e.message ?: "Erreur", previous)) }
            }
        }
    }

    private companion object {
        const val CACHE_KEY = "grades"
        val GRADES = ListSerializer(Grade.serializer())
    }
}
