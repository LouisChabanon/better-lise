package com.betterlise.app

import androidx.compose.ui.test.assertContentDescriptionContains
import androidx.compose.ui.test.hasTestTag
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.compose.ui.test.performScrollToNode
import androidx.datastore.preferences.core.PreferenceDataStoreFactory
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.betterlise.app.data.api.ApiClient
import com.betterlise.app.data.auth.InMemorySecureStore
import com.betterlise.app.data.auth.SessionRepository
import com.betterlise.app.data.cache.ResponseCache
import com.betterlise.app.data.local.LocalStateRepository
import com.betterlise.app.ui.achievements.AchievementsScreen
import com.betterlise.app.ui.achievements.AchievementsViewModel
import com.betterlise.app.ui.theme.BetterLiseTheme
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
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

/** JVM UI test (Robolectric): achievements keep locked secrets hidden and unlocked ones show their snark. */
@RunWith(AndroidJUnit4::class)
@Config(sdk = [35])
class AchievementsUiTest {
    @get:Rule val compose = createComposeRule()
    @get:Rule val tmp = TemporaryFolder()
    private val server = MockWebServer()

    @Before
    fun setUp() {
        server.dispatcher = object : Dispatcher() {
            override fun dispatch(request: RecordedRequest): MockResponse = when {
                request.path.orEmpty().endsWith("/achievements") -> Responses.success(
                    """{"achievements":[
                        {"code":"FIRST_LOGIN","title":"Sal'ss!","description":"Connectez-vous pour la première fois.","icon":"rocket","rarity":"Common","isSecret":false,"unlockedAt":"2025-01-02T10:00:00.000Z"},
                        {"code":"DIEU_MATA","title":"Dieu des matériaux","description":"Obtenir plus de 18/20 à un DS de MATA","snark":"Même l'archi Morel n'est pas autant un maxeur","icon":"experiment","rarity":"Legendary","isSecret":false,"unlockedAt":"2025-02-02T10:00:00.000Z"},
                        {"code":"SACQUE","title":"???","description":null,"snark":null,"icon":null,"rarity":"Legendary","isSecret":true,"unlockedAt":null}
                    ],"newlyUnlocked":[]}""",
                )
                else -> MockResponse().setResponseCode(404)
            }
        }
        server.start()
        val store = InMemorySecureStore().apply {
            set(SessionRepository.KEY_TOKEN, "t")
            set(SessionRepository.KEY_USERNAME, "2023-1234")
        }
        val localState = LocalStateRepository(
            PreferenceDataStoreFactory.create(
                scope = CoroutineScope(Dispatchers.IO + SupervisorJob()),
                produceFile = { File(tmp.root, "local.preferences_pb") },
            ),
        )
        val viewModel = AchievementsViewModel(
            SessionRepository(ApiClient(server.url("/").toString()), store),
            ResponseCache(tmp.newFolder("cache")),
            localState,
        )
        compose.setContent { BetterLiseTheme { AchievementsScreen(viewModel, onBack = {}) } }
    }

    @After
    fun tearDown() = server.shutdown()

    @Test
    fun lockedSecretsStayHiddenAndUnlockedOnesShowTheirSnark() {
        compose.waitUntil(10_000) { compose.onAllNodes(hasTestTag("achievement-FIRST_LOGIN")).fetchSemanticsNodes().isNotEmpty() }
        compose.onNodeWithTag("achievementsGrid").performScrollToNode(hasTestTag("achievement-SACQUE"))
        compose.onNodeWithTag("achievement-SACQUE").assertContentDescriptionContains("???", substring = true)

        compose.onNodeWithTag("achievement-DIEU_MATA").performScrollTo().performClick()
        compose.waitUntil(5_000) {
            compose.onAllNodes(hasText("« Même l'archi Morel n'est pas autant un maxeur »")).fetchSemanticsNodes().isNotEmpty()
        }
    }
}
