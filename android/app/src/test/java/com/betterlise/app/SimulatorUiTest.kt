package com.betterlise.app

import androidx.compose.ui.test.hasTestTag
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performTextReplacement
import androidx.compose.ui.test.performScrollTo
import androidx.datastore.preferences.core.PreferenceDataStoreFactory
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.betterlise.app.data.api.ApiClient
import com.betterlise.app.data.api.LiseHealth
import com.betterlise.app.data.auth.InMemorySecureStore
import com.betterlise.app.data.auth.SessionRepository
import com.betterlise.app.data.cache.ResponseCache
import com.betterlise.app.data.health.LiseHealthMonitor
import com.betterlise.app.data.local.LocalStateRepository
import com.betterlise.app.ui.grades.GradesScreen
import com.betterlise.app.ui.grades.GradesViewModel
import com.betterlise.app.ui.simulator.SimulatorViewModel
import com.betterlise.app.ui.theme.BetterLiseTheme
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.map
import okhttp3.mockwebserver.Dispatcher
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import okhttp3.mockwebserver.RecordedRequest
import org.junit.After
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import org.junit.runner.RunWith
import org.robolectric.annotation.Config
import java.io.File

/** JVM UI test (Robolectric): the Moyennes switch projects the average of a simulated grade. */
@RunWith(AndroidJUnit4::class)
@Config(sdk = [35])
class SimulatorUiTest {
    @get:Rule val compose = createComposeRule()
    @get:Rule val tmp = TemporaryFolder()
    private val server = MockWebServer()

    @Before
    fun setUp() {
        server.dispatcher = object : Dispatcher() {
            override fun dispatch(request: RecordedRequest): MockResponse {
                val path = request.path.orEmpty()
                return when {
                    path.endsWith("/grades/weights") -> Responses.success("""{"weights":{}}""")
                    path.startsWith("/api/v1/grades") -> Responses.success(
                        """{"grades":[{"date":"02/02/2025","code":"FITE_S7_MATA_DS","libelle":"DS Matériaux","note":12,"isNew":false}]}""",
                    )
                    else -> MockResponse().setResponseCode(404)
                }
            }
        }
        server.start()
        val store = InMemorySecureStore().apply {
            set(SessionRepository.KEY_TOKEN, "t")
            set(SessionRepository.KEY_USERNAME, "2023-1234")
        }
        val session = SessionRepository(ApiClient(server.url("/").toString()), store)
        val cache = ResponseCache(tmp.newFolder("cache"))
        val grades = GradesViewModel(session, cache, LiseHealthMonitor(fetch = { LiseHealth(1_500.0, 10) }))
        val localState = LocalStateRepository(
            PreferenceDataStoreFactory.create(
                scope = CoroutineScope(Dispatchers.IO + SupervisorJob()),
                produceFile = { File(tmp.root, "local.preferences_pb") },
            ),
        )
        val simulator = SimulatorViewModel(grades.state.map { it.grades.value.orEmpty() }, session, cache, localState)
        compose.setContent {
            BetterLiseTheme {
                GradesScreen(grades, revealMode = false, onSignIn = {}, simulator = simulator, onOpenAchievements = {})
            }
        }
    }

    @After
    fun tearDown() = server.shutdown()

    @Test
    fun simulatedGradeProjectsTheAverage() {
        compose.waitUntil(10_000) { compose.onAllNodes(hasText("Moyennes")).fetchSemanticsNodes().isNotEmpty() }
        compose.onNodeWithText("Moyennes").performClick()

        compose.waitUntil(5_000) { compose.onAllNodes(hasText("MATA")).fetchSemanticsNodes().isNotEmpty() }
        compose.onNodeWithTag("projectionDelta", useUnmergedTree = true).assertDoesNotExist()

        compose.onNodeWithTag("addSimulation").performClick()
        compose.waitUntil(5_000) { compose.onAllNodes(hasTestTag("confirmSimulation")).fetchSemanticsNodes().isNotEmpty() }
        compose.onNodeWithTag("simulationCoeff").performScrollTo().performTextReplacement("abc")
        compose.onNodeWithTag("confirmSimulation").performScrollTo().assertIsNotEnabled()
        compose.onNodeWithTag("simulationCoeff").performTextReplacement("1,33")
        compose.onNodeWithTag("confirmSimulation").performScrollTo().performClick()

        // The UE summary merges its texts for accessibility, so look the delta up in the unmerged tree
        compose.waitUntil(5_000) { compose.onAllNodes(hasTestTag("projectionDelta"), useUnmergedTree = true).fetchSemanticsNodes().isNotEmpty() }
        compose.onNodeWithText("coeff. 1,33", useUnmergedTree = true).assertExists()
        // 12 (coeff 1) and a simulated 10 (coeff 1,33): (12 + 13,3) / 2,33 = 10,86, so -1,14
        compose.onNodeWithText("-1,14", useUnmergedTree = true).assertExists()
    }
}
