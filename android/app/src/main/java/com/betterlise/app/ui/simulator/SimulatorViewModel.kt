package com.betterlise.app.ui.simulator

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.betterlise.app.data.api.Endpoints
import com.betterlise.app.data.api.Grade
import com.betterlise.app.data.auth.SessionRepository
import com.betterlise.app.data.auth.SessionState
import com.betterlise.app.data.cache.ResponseCache
import com.betterlise.app.data.local.LocalStateRepository
import com.betterlise.app.domain.ClassCodeParser
import com.betterlise.app.domain.CoefficientInput
import com.betterlise.app.domain.SimulatedGrade
import com.betterlise.app.domain.SimulatorData
import com.betterlise.app.domain.SimulatorGrouping
import com.betterlise.app.domain.SimulatorRealGrade
import com.betterlise.app.domain.UEGroup
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.serialization.builtins.MapSerializer
import kotlinx.serialization.builtins.serializer

data class SimulatorUiState(
    val grades: List<Grade> = emptyList(),
    val weights: Map<String, Double> = emptyMap(),
    val data: SimulatorData = SimulatorData(),
    /** null follows the most recent semester. */
    val selectedSemester: String? = null,
    val sharingCodes: Set<String> = emptySet(),
    val error: String? = null,
) {
    val availableSemesters: List<String> get() = SimulatorGrouping.availableSemesters(grades)
    val semester: String get() = selectedSemester ?: availableSemesters.firstOrNull() ?: SimulatorGrouping.ALL_SEMESTERS
    val groups: List<UEGroup> get() = SimulatorGrouping.groups(grades, weights, data, semester)

    /** UEs offered when adding a simulation. */
    val availableClasses: List<String>
        get() = groups.map { it.classCode }.filter { it != ClassCodeParser.UNASSIGNED } + ClassCodeParser.UNASSIGNED
}

private data class Editable(
    val weights: Map<String, Double> = emptyMap(),
    val data: SimulatorData = SimulatorData(),
    val selectedSemester: String? = null,
    val sharingCodes: Set<String> = emptySet(),
    val error: String? = null,
)

class SimulatorViewModel(
    grades: Flow<List<Grade>>,
    private val session: SessionRepository,
    private val cache: ResponseCache,
    private val localState: LocalStateRepository,
) : ViewModel() {
    private val editable = MutableStateFlow(Editable())
    private var username: String? = null

    val state: StateFlow<SimulatorUiState> = combine(grades.distinctUntilChanged(), editable) { list, edit ->
        SimulatorUiState(list, edit.weights, edit.data, edit.selectedSemester, edit.sharingCodes, edit.error)
    }.stateIn(viewModelScope, SharingStarted.Eagerly, SimulatorUiState())

    init {
        viewModelScope.launch {
            session.state.map { (it as? SessionState.SignedIn)?.username }.distinctUntilChanged().collect { user ->
                username = user
                val data = user?.let { localState.simulator(it) } ?: SimulatorData()
                editable.update { it.copy(data = data, selectedSemester = null, error = null) }
                if (user != null) loadWeights()
            }
        }
    }

    fun loadWeights() {
        viewModelScope.launch {
            if (editable.value.weights.isEmpty()) {
                cache.load(CACHE_KEY, WEIGHTS)?.let { cached -> editable.update { it.copy(weights = cached) } }
            }
            try {
                val weights = session.send(Endpoints.communityWeights()).weights
                cache.save(CACHE_KEY, WEIGHTS, weights)
                editable.update { it.copy(weights = weights, error = null) }
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                editable.update { it.copy(error = "Coefficients de la communauté indisponibles : ${e.message}") }
            }
        }
    }

    fun selectSemester(semester: String) = editable.update { it.copy(selectedSemester = semester) }

    fun addSimulation(name: String, grade: Double, coeff: Double, classCode: String) {
        if (!CoefficientInput.isValid(coeff)) return
        val simulation = SimulatedGrade(
            name = name.trim().ifEmpty { "Simu." },
            grade = grade.coerceIn(0.0, 20.0),
            coeff = coeff,
            classCode = classCode,
        )
        updateData { it.copy(simulations = it.simulations + simulation) }
    }

    fun removeSimulation(id: String) = updateData { data -> data.copy(simulations = data.simulations.filterNot { it.id == id }) }

    fun setSimulatedGrade(id: String, value: Double) = updateData { data ->
        data.copy(simulations = data.simulations.map { if (it.id == id) it.copy(grade = value.coerceIn(0.0, 20.0)) else it })
    }

    fun setLocalCoeff(code: String, value: Double) {
        if (!CoefficientInput.isValid(value)) return
        updateData { it.copy(localCoeffs = it.localCoeffs + (code to value)) }
    }

    fun assignClass(code: String, classCode: String) {
        val trimmed = classCode.trim()
        if (trimmed.isEmpty()) return
        updateData { it.copy(classOverrides = it.classOverrides + (code to trimmed.uppercase())) }
    }

    /** Shares the user's coefficient; on success it becomes the community value, as on the web. */
    fun shareCoeff(grade: SimulatorRealGrade) {
        val code = grade.code
        editable.update { it.copy(sharingCodes = it.sharingCodes + code) }
        viewModelScope.launch {
            try {
                val response = session.send(Endpoints.voteWeight(code, grade.effectiveCoeff))
                editable.update { it.copy(weights = it.weights + (code to response.weight), error = null) }
                cache.save(CACHE_KEY, WEIGHTS, editable.value.weights)
                updateData { it.copy(localCoeffs = it.localCoeffs - code) }
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                editable.update { it.copy(error = "Partage du coefficient impossible : ${e.message}") }
            } finally {
                editable.update { it.copy(sharingCodes = it.sharingCodes - code) }
            }
        }
    }

    fun dismissError() = editable.update { it.copy(error = null) }

    private fun updateData(change: (SimulatorData) -> SimulatorData) {
        editable.update { it.copy(data = change(it.data)) }
        val user = username ?: return
        val snapshot = editable.value.data
        viewModelScope.launch { localState.saveSimulator(user, snapshot) }
    }

    private companion object {
        const val CACHE_KEY = "community_weights"
        val WEIGHTS = MapSerializer(String.serializer(), Double.serializer())
    }
}
