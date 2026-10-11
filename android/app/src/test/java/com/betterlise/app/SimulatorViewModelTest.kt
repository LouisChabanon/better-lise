package com.betterlise.app

import androidx.datastore.preferences.core.PreferenceDataStoreFactory
import androidx.lifecycle.viewModelScope
import com.betterlise.app.data.api.ApiClient
import com.betterlise.app.data.api.Grade
import com.betterlise.app.data.auth.InMemorySecureStore
import com.betterlise.app.data.auth.SessionRepository
import com.betterlise.app.data.cache.ResponseCache
import com.betterlise.app.data.local.LocalStateRepository
import com.betterlise.app.domain.SimulatorData
import com.betterlise.app.ui.simulator.SimulatorUiState
import com.betterlise.app.ui.simulator.SimulatorViewModel
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.joinAll
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeout
import okhttp3.mockwebserver.Dispatcher
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import okhttp3.mockwebserver.RecordedRequest
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import java.io.File
import java.util.concurrent.ConcurrentLinkedQueue

@OptIn(ExperimentalCoroutinesApi::class)
class SimulatorViewModelTest {
    @get:Rule val tmp = TemporaryFolder()
    private lateinit var server: MockWebServer
    private lateinit var session: SessionRepository
    private lateinit var localState: LocalStateRepository
    private val viewModels = mutableListOf<SimulatorViewModel>()
    private val requests = ConcurrentLinkedQueue<RecordedRequest>()
    @Volatile private var voteFails = false

    private val grades = MutableStateFlow(
        listOf(
            Grade(date = "02/02/2025", code = "FITE_S7_MATA_DS", libelle = "DS Matériaux", note = 12.0, isNew = false),
            Grade(date = "01/02/2025", code = "FITE_S6_MECA_DS", libelle = "DS Méca", note = 9.0, isNew = false),
        ),
    )

    @Before
    fun setUp() {
        Dispatchers.setMain(UnconfinedTestDispatcher())
        server = MockWebServer().apply {
            dispatcher = object : Dispatcher() {
                override fun dispatch(request: RecordedRequest): MockResponse {
                    requests += request
                    val path = request.path.orEmpty()
                    return when {
                        path.endsWith("/grades/weights") -> Responses.success("""{"weights":{"FITE_S7_MATA_DS":2}}""")
                        path.endsWith("/weight") && voteFails -> Responses.failure(500, "INTERNAL")
                        path.endsWith("/weight") -> Responses.success("""{"code":"FITE_S7_MATA_DS","weight":3}""")
                        else -> MockResponse().setResponseCode(404)
                    }
                }
            }
            start()
        }
        val store = InMemorySecureStore().apply {
            set(SessionRepository.KEY_TOKEN, "t")
            set(SessionRepository.KEY_USERNAME, "2023-1234")
        }
        session = SessionRepository(ApiClient(server.url("/").toString()), store)
        localState = LocalStateRepository(
            PreferenceDataStoreFactory.create(
                scope = CoroutineScope(Dispatchers.IO + SupervisorJob()),
                produceFile = { File(tmp.root, "local.preferences_pb") },
            ),
        )
    }

    @After
    fun tearDown() {
        val jobs = viewModels.mapNotNull { it.viewModelScope.coroutineContext[Job] }
        jobs.forEach { it.cancel() }
        server.shutdown()
        runBlocking { withTimeout(5_000) { jobs.joinAll() } }
        Dispatchers.resetMain()
    }

    private fun makeViewModel() = SimulatorViewModel(grades, session, ResponseCache(tmp.newFolder()), localState).also { viewModels += it }

    private suspend fun SimulatorViewModel.await(predicate: (SimulatorUiState) -> Boolean): SimulatorUiState =
        withContext(Dispatchers.Default) { withTimeout(5_000) { state.first(predicate) } }

    @Test
    fun `defaults to the latest semester and uses community weights`() = runTest {
        val viewModel = makeViewModel()
        val state = viewModel.await { it.weights.isNotEmpty() }

        assertEquals("S7", state.semester)
        assertEquals(listOf("MATA"), state.groups.map { it.classCode })
        assertTrue(state.groups.first().real.first().isCommunity)
        assertEquals(listOf("MATA", "Autre"), state.availableClasses)

        viewModel.selectSemester("all")
        assertEquals(listOf("MATA", "MECA"), viewModel.state.value.groups.map { it.classCode })
    }

    @Test
    fun `persists simulations per account`() = runTest {
        val viewModel = makeViewModel()
        viewModel.await { it.weights.isNotEmpty() }
        viewModel.addSimulation("  ", grade = 25.0, coeff = 1.33, classCode = "MATA")
        viewModel.addSimulation("Invalide", grade = 12.0, coeff = 0.0, classCode = "MATA")
        viewModel.setLocalCoeff("FITE_S7_MATA_DS", 0.0)
        viewModel.setLocalCoeff("FITE_S7_MATA_DS", 4.0)

        val data = viewModel.state.value.data
        val simulation = data.simulations.single()
        assertEquals("Simu.", simulation.name)
        assertEquals(20.0, simulation.grade, 0.0)
        assertEquals(1.33, simulation.coeff, 0.0)
        assertEquals(mapOf("FITE_S7_MATA_DS" to 4.0), data.localCoeffs)

        withContext(Dispatchers.Default) { withTimeout(5_000) { while (localState.simulator("2023-1234") != data) delay(10) } }
        val relaunched = makeViewModel()
        assertEquals(data, relaunched.await { it.data.simulations.isNotEmpty() }.data)

        localState.clearAll()
        assertEquals(SimulatorData(), localState.simulator("2023-1234"))
    }

    @Test
    fun `sharing a coefficient makes it the community value`() = runTest {
        val viewModel = makeViewModel()
        viewModel.await { it.weights.isNotEmpty() }
        viewModel.setLocalCoeff("FITE_S7_MATA_DS", 3.0)
        viewModel.shareCoeff(viewModel.state.value.groups.first().real.first())

        val state = viewModel.await { it.sharingCodes.isEmpty() && it.data.localCoeffs.isEmpty() }
        assertEquals(3.0, state.weights["FITE_S7_MATA_DS"]!!, 0.0)
        assertFalse(state.groups.first().real.first().canShare)
        val vote = requests.firstOrNull { it.path.orEmpty().endsWith("/weight") }
        assertNotNull(vote)
        assertEquals("PUT", vote!!.method)
        assertEquals("/api/v1/grades/FITE_S7_MATA_DS/weight", vote.path)
        assertEquals("""{"weight":3.0}""", vote.body.readUtf8())
    }

    @Test
    fun `failed share keeps the local coefficient`() = runTest {
        voteFails = true
        val viewModel = makeViewModel()
        viewModel.await { it.weights.isNotEmpty() }
        viewModel.setLocalCoeff("FITE_S7_MATA_DS", 3.0)
        viewModel.shareCoeff(viewModel.state.value.groups.first().real.first())

        val state = viewModel.await { it.sharingCodes.isEmpty() && it.error != null }
        assertEquals(mapOf("FITE_S7_MATA_DS" to 3.0), state.data.localCoeffs)
    }
}
