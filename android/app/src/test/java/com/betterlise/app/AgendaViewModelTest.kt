package com.betterlise.app

import androidx.datastore.preferences.core.PreferenceDataStoreFactory
import com.betterlise.app.data.api.ApiClient
import com.betterlise.app.data.auth.InMemorySecureStore
import com.betterlise.app.data.auth.SessionRepository
import com.betterlise.app.data.cache.ResponseCache
import com.betterlise.app.data.settings.SettingsRepository
import com.betterlise.app.ui.agenda.AgendaViewModel
import kotlinx.coroutines.CoroutineScope
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeout
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import java.io.File
import java.time.DayOfWeek
import java.time.LocalDate

@OptIn(ExperimentalCoroutinesApi::class)
class AgendaViewModelTest {
    @get:Rule val tmp = TemporaryFolder()
    private val wednesday = LocalDate.of(2025, 3, 12)
    private lateinit var model: AgendaViewModel

    @Before
    fun setUp() {
        Dispatchers.setMain(UnconfinedTestDispatcher())
        val dataStore = PreferenceDataStoreFactory.create(
            scope = CoroutineScope(Dispatchers.IO + SupervisorJob()),
            produceFile = { File(tmp.root, "settings.preferences_pb") },
        )
        model = AgendaViewModel(
            session = SessionRepository(ApiClient("http://localhost:1"), InMemorySecureStore()),
            settingsRepository = SettingsRepository(dataStore),
            cache = ResponseCache(tmp.newFolder("cache")),
            today = { wednesday },
        )
    }

    @After
    fun tearDown() {
        // Let DataStore reads started on Dispatchers.IO finish before Main is reset
        val job = model.viewModelScope.coroutineContext[Job]
        job?.cancel()
        runBlocking { withTimeout(5_000) { job?.join() } }
        Dispatchers.resetMain()
    }

    private val state get() = model.state.value

    @Test
    fun `opens on the current week`() {
        assertEquals(state.todayIndex / 5, state.currentWeek)
        assertEquals(state.currentWeek, state.visibleWeek)
        assertEquals(LocalDate.of(2025, 3, 10), state.visibleWeekStart)
        assertTrue(state.isShowingCurrentWeek)
        assertNull(state.pagerRequest)
    }

    @Test
    fun `swiping changes the visible week`() {
        model.pagerDidScroll(state.currentWeek + 1)

        assertEquals(state.currentWeek + 1, state.visibleWeek)
        assertEquals(LocalDate.of(2025, 3, 17), state.visibleWeekStart)
        assertEquals(DayOfWeek.MONDAY, state.visibleWeekStart.dayOfWeek)
        assertFalse(state.isShowingCurrentWeek)
        assertNull(state.pagerRequest)
    }

    @Test
    fun `reports for the week already shown or out of range are ignored`() {
        model.pagerDidScroll(state.currentWeek + 1)

        model.pagerDidScroll(state.visibleWeek)
        model.pagerDidScroll(-1)
        model.pagerDidScroll(state.weekCount)

        assertEquals(state.currentWeek + 1, state.visibleWeek)
        assertNull(state.pagerRequest)
    }

    @Test
    fun `going back to today scrolls to the current week`() {
        model.pagerDidScroll(0)

        model.goToToday()

        assertEquals(state.currentWeek, state.visibleWeek)
        assertEquals(state.currentWeek, state.pagerRequest?.target)
        assertTrue(state.isShowingCurrentWeek)
    }

    @Test
    fun `repeated requests to the same target are distinct`() {
        model.pagerDidScroll(0)
        model.goToToday()
        val first = state.pagerRequest
        model.pagerDidScroll(1)
        model.goToToday()

        assertEquals(first?.target, state.pagerRequest?.target)
        assertNotEquals(first, state.pagerRequest)
    }

    @Test
    fun `weeks expose their five school days`() {
        val days = state.indicesInWeek(state.currentWeek).map { state.days[it] }

        assertEquals(5, days.size)
        assertTrue(wednesday in days)
        assertFalse(state.hasAllDayEvents(state.currentWeek))
    }
}
