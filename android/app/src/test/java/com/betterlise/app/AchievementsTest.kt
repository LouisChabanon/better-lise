package com.betterlise.app

import androidx.datastore.preferences.core.PreferenceDataStoreFactory
import androidx.lifecycle.viewModelScope
import com.betterlise.app.data.api.Achievement
import com.betterlise.app.data.api.AchievementRarity
import com.betterlise.app.data.api.ApiClient
import com.betterlise.app.data.api.Endpoints
import com.betterlise.app.data.api.LiseHealthStatus
import com.betterlise.app.data.auth.InMemorySecureStore
import com.betterlise.app.data.auth.SessionRepository
import com.betterlise.app.data.cache.ResponseCache
import com.betterlise.app.data.local.LocalStateRepository
import com.betterlise.app.domain.AchievementCelebration
import com.betterlise.app.domain.AchievementSummary
import com.betterlise.app.ui.achievements.AchievementsViewModel
import com.betterlise.app.ui.achievements.AchievementsUiState
import com.betterlise.app.ui.components.Loadable
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.joinAll
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeout
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import java.io.File
import java.time.Instant

private fun achievement(code: String, rarity: AchievementRarity = AchievementRarity.Common, secret: Boolean = false, unlocked: Boolean) =
    Achievement(
        code = code,
        title = if (secret && !unlocked) "???" else code,
        rarity = rarity,
        isSecret = secret,
        unlockedAt = if (unlocked) Instant.EPOCH else null,
    )

class AchievementRulesTest {
    @Test
    fun `summarizes progress`() {
        val summary = AchievementSummary.of(
            listOf(
                achievement("A", unlocked = true),
                achievement("B", AchievementRarity.Rare, unlocked = true),
                achievement("C", AchievementRarity.Legendary, secret = true, unlocked = true),
                achievement("D", AchievementRarity.Legendary, secret = true, unlocked = false),
            ),
        )
        assertEquals(AchievementSummary(total = 4, unlocked = 3, legendary = 1, rare = 1, secrets = 2, secretsFound = 1), summary)
        assertEquals(0.75, summary.progress, 0.0)
        assertEquals(0.0, AchievementSummary.of(emptyList()).progress, 0.0)
    }

    @Test
    fun `first run only celebrates what this sync unlocked`() {
        val list = listOf(achievement("OLD", unlocked = true), achievement("NEW", unlocked = true), achievement("LOCKED", unlocked = false))
        val seen = AchievementCelebration.initialSeen(list, listOf("NEW"))
        assertEquals(setOf("OLD"), seen)
        assertEquals(listOf("NEW"), AchievementCelebration.pending(list, seen).map { it.code })
    }

    @Test
    fun `defers only while reveal mode hides grades`() {
        assertTrue(AchievementCelebration.shouldDefer(revealMode = true, unreadGrades = 1))
        assertFalse(AchievementCelebration.shouldDefer(revealMode = true, unreadGrades = 0))
        assertFalse(AchievementCelebration.shouldDefer(revealMode = false, unreadGrades = 3))
    }
}

@OptIn(ExperimentalCoroutinesApi::class)
class AchievementsViewModelTest {
    @get:Rule val tmp = TemporaryFolder()
    private lateinit var server: MockWebServer
    private lateinit var session: SessionRepository
    private lateinit var localState: LocalStateRepository
    private val viewModels = mutableListOf<AchievementsViewModel>()

    private val firstJson = """{"achievements":[
        {"code":"FIRST_LOGIN","title":"Sal'ss!","description":"d","icon":"rocket","rarity":"Common","isSecret":false,"unlockedAt":"2025-01-02T10:00:00.000Z"},
        {"code":"ACADEMIC_GOAT","title":"Birseur fou","description":"d","icon":"trophy","rarity":"Rare","isSecret":false,"unlockedAt":"2025-03-02T10:00:00.000Z"},
        {"code":"SACQUE","title":"???","description":null,"snark":null,"icon":null,"rarity":"Legendary","isSecret":true,"unlockedAt":null}
    ],"newlyUnlocked":["ACADEMIC_GOAT"]}"""
    private val laterJson = """{"achievements":[
        {"code":"FIRST_LOGIN","title":"Sal'ss!","description":"d","icon":"rocket","rarity":"Common","isSecret":false,"unlockedAt":"2025-01-02T10:00:00.000Z"},
        {"code":"ACADEMIC_GOAT","title":"Birseur fou","description":"d","icon":"trophy","rarity":"Rare","isSecret":false,"unlockedAt":"2025-03-02T10:00:00.000Z"},
        {"code":"SACQUE","title":"Ami Sacqué","description":"d","snark":"s","icon":"reload","rarity":"Mythic","isSecret":true,"unlockedAt":"2025-04-02T10:00:00Z"}
    ],"newlyUnlocked":[]}"""

    @Before
    fun setUp() {
        Dispatchers.setMain(UnconfinedTestDispatcher())
        server = MockWebServer().apply { start() }
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

    private fun makeViewModel() = AchievementsViewModel(session, ResponseCache(tmp.newFolder()), localState).also { viewModels += it }

    private suspend fun AchievementsViewModel.awaitSettled(): AchievementsUiState = withContext(Dispatchers.Default) {
        withTimeout(5_000) { state.first { it.achievements is Loadable.Loaded || it.achievements is Loadable.Failed } }
    }

    @Test
    fun `celebrates new unlocks once across launches`() = runTest {
        server.enqueue(Responses.success(firstJson))
        server.enqueue(Responses.success(laterJson))
        val viewModel = makeViewModel()
        viewModel.refresh()
        val first = viewModel.awaitSettled()

        assertEquals(listOf("ACADEMIC_GOAT"), first.pendingCelebration.map { it.code })
        val masked = first.achievements.value!!.last()
        assertTrue(masked.isHidden)
        assertNull(masked.description)
        assertEquals(0, first.summary.secretsFound)

        viewModel.markCelebrated()
        assertTrue(viewModel.state.value.pendingCelebration.isEmpty())
        withContext(Dispatchers.Default) {
            withTimeout(5_000) { while (localState.celebratedAchievements("2023-1234")?.contains("ACADEMIC_GOAT") != true) delay(10) }
        }

        // Next launch: the secret was unlocked meanwhile, and an unknown rarity falls back to common
        val relaunched = makeViewModel()
        relaunched.refresh()
        val later = relaunched.awaitSettled()
        assertEquals(listOf("SACQUE"), later.pendingCelebration.map { it.code })
        assertEquals(AchievementRarity.Common, later.achievements.value!!.last().rarity)
    }

    @Test
    fun `keeps cached achievements when the server fails`() = runTest {
        server.enqueue(Responses.success(firstJson))
        server.enqueue(Responses.failure(500, "INTERNAL"))
        val viewModel = makeViewModel()
        viewModel.refresh()
        viewModel.awaitSettled()
        viewModel.refresh()
        val failed = withContext(Dispatchers.Default) {
            withTimeout(5_000) { viewModel.state.first { it.achievements is Loadable.Failed } }
        }
        assertEquals(3, failed.achievements.value?.size)
    }

    @Test
    fun `decodes older and newer health payloads`() = runTest {
        server.enqueue(Responses.success("""{"avgDuration":1500,"count":10}"""))
        server.enqueue(Responses.success("""{"avgDuration":16000,"count":10,"status":"slow","hourly":[{"hour":"2025-03-10T10:00:00.000Z","avgDuration":16000,"count":10,"failures":1}]}"""))

        val old = session.sendPublic(Endpoints.health())
        assertEquals(LiseHealthStatus.Unknown, old.liseStatus)
        assertNull(old.hourly)

        val new = session.sendPublic(Endpoints.health())
        assertEquals(LiseHealthStatus.Slow, new.liseStatus)
        assertNotNull(new.hourly)
        assertEquals(1, new.hourly!!.first().failures)
    }
}
