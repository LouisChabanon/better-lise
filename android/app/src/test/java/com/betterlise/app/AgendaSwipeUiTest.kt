package com.betterlise.app

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.hasTestTag
import androidx.compose.ui.test.isSelected
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.onRoot
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performTouchInput
import androidx.compose.ui.test.swipeLeft
import androidx.compose.ui.test.swipeRight
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.datastore.preferences.core.PreferenceDataStoreFactory
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.betterlise.app.data.api.ApiClient
import com.betterlise.app.data.auth.InMemorySecureStore
import com.betterlise.app.data.auth.SessionRepository
import com.betterlise.app.data.cache.ResponseCache
import com.betterlise.app.data.settings.SettingsRepository
import com.betterlise.app.ui.agenda.AgendaScreen
import com.betterlise.app.ui.agenda.AgendaViewModel
import com.betterlise.app.ui.theme.BetterLiseTheme
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import org.junit.runner.RunWith
import org.robolectric.annotation.Config
import java.io.File
import java.time.LocalDate

/** JVM UI tests (Robolectric): the agenda shows whole weeks and swipes between them. */
@RunWith(AndroidJUnit4::class)
@Config(sdk = [35])
class AgendaSwipeUiTest {
    @get:Rule val compose = createComposeRule()
    @get:Rule val tmp = TemporaryFolder()

    @Before
    fun setUp() {
        val settings = SettingsRepository(
            PreferenceDataStoreFactory.create(
                scope = CoroutineScope(Dispatchers.IO + SupervisorJob()),
                produceFile = { File(tmp.root, "settings.preferences_pb") },
            ),
        )
        runBlocking { settings.setLiseId("2023-1234") }
        val model = AgendaViewModel(
            session = SessionRepository(ApiClient("http://localhost:1"), InMemorySecureStore()),
            settingsRepository = settings,
            cache = ResponseCache(tmp.newFolder("cache")),
            today = { LocalDate.of(2025, 3, 12) },
        )
        compose.setContent { BetterLiseTheme { AgendaScreen(model) } }
        compose.waitUntil(5_000) { visibleHeaders().size == 5 }
    }

    private fun settledHeaders(): List<String> {
        compose.waitForIdle()
        return visibleHeaders()
    }

    /** Day numbers of the headers on screen, i.e. the week currently shown. */
    private fun visibleHeaders(): List<String> {
        val width = compose.onRoot().fetchSemanticsNode().boundsInRoot.right
        return compose.onAllNodes(hasTestTag("dayHeader")).fetchSemanticsNodes()
            // Pages kept around the visible one report empty bounds
            .filter { it.boundsInRoot.width > 0f && it.boundsInRoot.left >= -0.5f && it.boundsInRoot.right <= width + 0.5f }
            .map { it.config[SemanticsProperties.ContentDescription].first() }
    }

    @Test
    fun opensOnTheWholeCurrentWeekWithTodayHighlighted() {
        assertEquals(
            listOf("lundi 10 mars 2025", "mardi 11 mars 2025", "mercredi 12 mars 2025", "jeudi 13 mars 2025", "vendredi 14 mars 2025"),
            settledHeaders(),
        )
        compose.onNode(hasTestTag("dayHeader") and isSelected()).assertIsDisplayed()
        compose.onNodeWithText("Aujourd'hui").assertDoesNotExist()
    }

    @Test
    fun swipingChangesTheWeekAndTodayBringsItBack() {
        val initial = settledHeaders()

        compose.onNodeWithTag("weekPager").performTouchInput { swipeLeft() }
        val next = settledHeaders()
        assertEquals("lundi 17 mars 2025", next.first())

        compose.onNodeWithTag("weekPager").performTouchInput { swipeRight() }
        compose.onNodeWithTag("weekPager").performTouchInput { swipeRight() }
        assertEquals("lundi 3 mars 2025", settledHeaders().first())

        compose.onNodeWithText("Aujourd'hui").performClick()
        compose.waitUntil(5_000) { visibleHeaders() == initial }
        assertNotEquals(next, settledHeaders())
    }
}
