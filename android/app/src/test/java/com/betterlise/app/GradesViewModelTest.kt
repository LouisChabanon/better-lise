package com.betterlise.app

import com.betterlise.app.data.api.ApiClient
import com.betterlise.app.data.api.LiseHealth
import com.betterlise.app.data.auth.InMemorySecureStore
import com.betterlise.app.data.auth.SessionRepository
import com.betterlise.app.data.cache.ResponseCache
import com.betterlise.app.data.health.LiseHealthMonitor
import com.betterlise.app.ui.loading.SyncState
import com.betterlise.app.ui.components.Loadable
import com.betterlise.app.ui.grades.GradesViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeout
import kotlinx.coroutines.flow.first
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder

@OptIn(ExperimentalCoroutinesApi::class)
class GradesViewModelTest {
    @get:Rule val tmp = TemporaryFolder()
    private lateinit var server: MockWebServer
    private lateinit var session: SessionRepository
    private lateinit var health: LiseHealthMonitor

    private val gradesJson = """{"grades":[
        {"date":"01/01/2025","code":"OLD","libelle":"Old","note":8,"isNew":false},
        {"date":"02/02/2025","code":"NEW","libelle":"Nouvelle","note":15.5,"isNew":true}
    ]}"""

    @Before
    fun setUp() {
        Dispatchers.setMain(UnconfinedTestDispatcher())
        server = MockWebServer().apply { start() }
        val store = InMemorySecureStore().apply {
            set(SessionRepository.KEY_TOKEN, "t")
            set(SessionRepository.KEY_USERNAME, "2023-1234")
        }
        session = SessionRepository(ApiClient(server.url("/").toString()), store)
        // Canned estimate so the health call never consumes the queued grade responses
        health = LiseHealthMonitor(fetch = { LiseHealth(9_000.0, 10) })
    }

    @After
    fun tearDown() {
        server.shutdown()
        Dispatchers.resetMain()
    }

    // Requests run on a real OkHttp thread, so wait in real time rather than runTest's virtual time
    private suspend fun <T> awaitReal(block: suspend () -> T): T =
        withContext(Dispatchers.Default) { withTimeout(5_000) { block() } }

    private suspend fun GradesViewModel.awaitLoaded() = awaitReal {
        state.first { it.grades is Loadable.Loaded || it.grades is Loadable.Failed }
    }

    @Test
    fun `loads, sorts and filters grades`() = runTest {
        server.enqueue(Responses.success(gradesJson))
        val viewModel = GradesViewModel(session, ResponseCache(tmp.root), health)

        val state = viewModel.awaitLoaded()

        assertEquals(listOf("NEW", "OLD"), state.grades.value!!.map { it.code })
        // First sync without cache shows the full loader, then its "Terminé" state
        assertTrue(state.sync is SyncState.Finished && state.sync.showsFullLoader)
        assertEquals(1, state.unreadCount)
        viewModel.onQueryChange("old")
        assertEquals(listOf("OLD"), viewModel.state.value.visibleGrades.map { it.code })
    }

    @Test
    fun `rolls back the read flag when marking as opened fails`() = runTest {
        server.enqueue(Responses.success(gradesJson))
        server.enqueue(Responses.success("""{"avg":12,"min":2,"max":19,"count":3,"median":12,"stdDeviation":3,"distribution":{"labels":[],"counts":[]}}"""))
        server.enqueue(Responses.failure(500, "INTERNAL"))
        val viewModel = GradesViewModel(session, ResponseCache(tmp.root), health)
        val grade = viewModel.awaitLoaded().grades.value!!.first { it.code == "NEW" }

        viewModel.open(grade)

        val state = awaitReal { viewModel.state.first { it.grades is Loadable.Failed } }
        assertTrue(state.grades.value!!.first { it.code == "NEW" }.isUnread)
        assertEquals("NEW", state.selected?.code)
    }

    @Test
    fun `serves cached grades while refreshing`() = runTest {
        server.enqueue(Responses.success(gradesJson))
        val cache = ResponseCache(tmp.root)
        GradesViewModel(session, cache, health).awaitLoaded()

        server.enqueue(Responses.failure(502, "LISE_UNAVAILABLE"))
        val second = GradesViewModel(session, cache, health).awaitLoaded()

        assertTrue(second.grades is Loadable.Failed)
        assertEquals(2, second.grades.value!!.size)
        assertFalse(second.grades.value!!.isEmpty())
    }
}
