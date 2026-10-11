package com.betterlise.app

import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.compose.ui.test.hasTestTag
import androidx.datastore.preferences.core.PreferenceDataStoreFactory
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.betterlise.app.data.api.ApiClient
import com.betterlise.app.data.auth.InMemorySecureStore
import com.betterlise.app.data.auth.SessionRepository
import com.betterlise.app.data.cache.ResponseCache
import com.betterlise.app.data.settings.SettingsRepository
import com.betterlise.app.ui.settings.SettingsScreen
import com.betterlise.app.ui.settings.SettingsViewModel
import com.betterlise.app.ui.theme.BetterLiseTheme
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import org.junit.runner.RunWith
import org.robolectric.annotation.Config
import java.io.File

/** JVM UI test (Robolectric): account deletion states the Lise account is kept, then signs out. */
@RunWith(AndroidJUnit4::class)
@Config(sdk = [35])
class AccountDeletionUiTest {
    @get:Rule val compose = createComposeRule()
    @get:Rule val tmp = TemporaryFolder()
    private val server = MockWebServer()

    @Before
    fun setUp() {
        server.start()
        val store = InMemorySecureStore().apply {
            set(SessionRepository.KEY_TOKEN, "t")
            set(SessionRepository.KEY_USERNAME, "2023-1234")
        }
        val settings = SettingsRepository(
            PreferenceDataStoreFactory.create(
                scope = CoroutineScope(Dispatchers.IO + SupervisorJob()),
                produceFile = { File(tmp.root, "settings.preferences_pb") },
            ),
        )
        val viewModel = SettingsViewModel(
            SessionRepository(ApiClient(server.url("/").toString()), store),
            settings,
            ResponseCache(tmp.newFolder("cache")),
        )
        compose.setContent { BetterLiseTheme { SettingsScreen(viewModel, onSignIn = {}) } }
    }

    @After
    fun tearDown() = server.shutdown()

    @Test
    fun deletingTheAccountExplainsLiseIsKeptThenSignsOut() {
        server.enqueue(Responses.success("""{"deleted":true}"""))
        compose.waitUntil(5_000) { compose.onAllNodes(hasTestTag("deleteAccount")).fetchSemanticsNodes().isNotEmpty() }

        compose.onNodeWithTag("deleteAccount").performScrollTo().performClick()
        compose.onNodeWithText("Supprimer ton compte Better Lise ?").assertExists()
        compose.onNode(hasText("ne supprime pas ton compte Lise", substring = true)).assertExists()
        compose.onNodeWithText("Supprimer").performClick()

        compose.waitUntil(10_000) { compose.onAllNodes(hasText("Se connecter avec Lise")).fetchSemanticsNodes().isNotEmpty() }
        compose.onNode(hasText("Ton compte Lise de l’ENSAM reste inchangé", substring = true)).assertExists()
        assertEquals("DELETE", server.takeRequest().method)
    }
}
