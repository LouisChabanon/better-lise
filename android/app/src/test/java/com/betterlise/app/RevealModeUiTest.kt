package com.betterlise.app

import androidx.compose.ui.test.assertCountEquals
import androidx.compose.ui.test.hasTestTag
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.betterlise.app.data.api.ApiClient
import com.betterlise.app.data.api.LiseHealth
import com.betterlise.app.data.auth.InMemorySecureStore
import com.betterlise.app.data.auth.SessionRepository
import com.betterlise.app.data.cache.ResponseCache
import com.betterlise.app.data.health.LiseHealthMonitor
import com.betterlise.app.ui.grades.GradesScreen
import com.betterlise.app.ui.grades.GradesViewModel
import com.betterlise.app.ui.theme.BetterLiseTheme
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

/** JVM UI test (Robolectric): a new grade goes through the reveal before its detail opens. */
@RunWith(AndroidJUnit4::class)
@Config(sdk = [35])
class RevealModeUiTest {
    @get:Rule val compose = createComposeRule()
    @get:Rule val tmp = TemporaryFolder()
    private val server = MockWebServer()
    @Volatile private var mataIsNew = true

    @Before
    fun setUp() {
        server.dispatcher = object : Dispatcher() {
            override fun dispatch(request: RecordedRequest): MockResponse {
                val path = request.path.orEmpty()
                return when {
                    path.endsWith("/grades/MATA/opened") -> { mataIsNew = false; Responses.success("""{"updated":1}""") }
                    path.endsWith("/grades/MATA/new") -> { mataIsNew = true; Responses.success("""{"updated":1}""") }
                    path.endsWith("/stats") -> Responses.success("""{"avg":12.4,"min":3,"max":19.5,"count":42,"median":12,"stdDeviation":3.2,"distribution":{"labels":["0-2","2-4","4-6","6-8","8-10","10-12","12-14","14-16","16-18","18-20"],"counts":[0,1,2,4,6,9,8,6,4,2]}}""")
                    path.startsWith("/api/v1/grades") -> Responses.success(
                        """{"grades":[{"date":"02/02/2025","code":"MATA","libelle":"DS Matériaux","note":18.5,"isNew":$mataIsNew}]}""",
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
        val viewModel = GradesViewModel(
            session,
            ResponseCache(tmp.newFolder("cache")),
            LiseHealthMonitor(fetch = { LiseHealth(1_500.0, 10) }),
        )
        compose.setContent { BetterLiseTheme { GradesScreen(viewModel, revealMode = true, onSignIn = {}) } }
    }

    @After
    fun tearDown() = server.shutdown()

    @Test
    fun newGradeIsRevealedThroughTheReelThenCanBeReplayed() {
        compose.waitUntil(10_000) { compose.onAllNodes(hasTestTag("hiddenGrade")).fetchSemanticsNodes().isNotEmpty() }
        compose.onNodeWithTag("hiddenGrade").performClick()

        compose.waitUntil(5_000) { compose.onAllNodes(androidx.compose.ui.test.hasText("Voir la note")).fetchSemanticsNodes().isNotEmpty() }
        // Drive the 8 s roll manually: auto-advance would fast-forward straight past the reveal
        compose.mainClock.autoAdvance = false
        compose.onNodeWithText("Voir la note").performClick()
        compose.mainClock.advanceTimeBy(4_000)
        compose.onNodeWithText("Révélation en cours…").assertExists()

        compose.mainClock.advanceTimeBy(4_800)
        compose.onAllNodes(androidx.compose.ui.test.hasText("Révélation en cours…")).assertCountEquals(0)

        compose.mainClock.advanceTimeBy(3_500)
        compose.mainClock.autoAdvance = true
        compose.waitUntil(10_000) { compose.onAllNodes(androidx.compose.ui.test.hasText("Moyenne")).fetchSemanticsNodes().isNotEmpty() }

        compose.onNodeWithText("Marquer comme nouvelle").performScrollTo().performClick()
        compose.waitUntil(10_000) { compose.onAllNodes(hasTestTag("hiddenGrade")).fetchSemanticsNodes().isNotEmpty() }
    }
}
