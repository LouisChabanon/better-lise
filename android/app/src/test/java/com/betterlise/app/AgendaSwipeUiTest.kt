package com.betterlise.app

import androidx.compose.ui.test.SemanticsMatcher
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.hasTestTag
import androidx.compose.ui.test.isSelected
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
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
import org.junit.Assert.assertNotEquals
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import org.junit.runner.RunWith
import org.robolectric.annotation.Config
import java.io.File
import java.time.LocalDate

/** JVM UI tests (Robolectric): swiping keeps the day pager and the week strip in sync. */
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
        compose.waitUntil(5_000) { selectedChips().isNotEmpty() }
    }

    private fun selectedChips() = compose.onAllNodes(hasTestTag("dayChip") and isSelected()).fetchSemanticsNodes()

    private fun selectedLabel(): String {
        compose.waitForIdle()
        val node = compose.onNode(hasTestTag("dayChip") and isSelected())
        node.assertIsDisplayed()
        return node.fetchSemanticsNode().config[SemanticsProperties.ContentDescription].first()
    }

    @Test
    fun swipingDaysAcrossWeeksKeepsTheHighlightedCardVisible() {
        var label = selectedLabel() // mercredi 12 mars

        repeat(6) {
            compose.onNodeWithTag("dayPager").performTouchInput { swipeLeft() }
            val next = selectedLabel()
            assertNotEquals(label, next)
            label = next
        }
        repeat(2) {
            compose.onNodeWithTag("dayPager").performTouchInput { swipeRight() }
            val next = selectedLabel()
            assertNotEquals(label, next)
            label = next
        }
    }

    @Test
    fun swipingTheWeekStripMovesTheCalendar() {
        val initial = selectedLabel()

        compose.onNodeWithTag("weekStrip").performTouchInput { swipeLeft() }

        assertNotEquals(initial, selectedLabel())
    }

    @Test
    fun tappingADayCardSelectsIt() {
        val initial = selectedLabel()
        val other = compose.onAllNodes(hasTestTag("dayChip") and SemanticsMatcher.expectValue(SemanticsProperties.Selected, false))
            .fetchSemanticsNodes()
            .first { it.boundsInRoot.left >= 0 }

        compose.onNode(SemanticsMatcher("same node") { it.id == other.id }).performClick()

        assertNotEquals(initial, selectedLabel())
    }
}
