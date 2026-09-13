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
    fun `opens on today and its week`() {
        assertEquals(state.todayIndex, state.selectedIndex)
        assertEquals(state.todayIndex / 5, state.visibleWeek)
        assertEquals(wednesday, state.selectedDay)
        assertTrue(state.isShowingToday)
        assertNull(state.pagerRequest)
        assertNull(state.stripRequest)
    }

    @Test
    fun `swiping within the week only moves the highlight`() {
        model.pagerDidScroll(state.todayIndex + 1)

        assertEquals(state.todayIndex + 1, state.selectedIndex)
        assertEquals(state.todayIndex / 5, state.visibleWeek)
        assertNull(state.stripRequest)
        assertNull(state.pagerRequest)
    }

    @Test
    fun `swiping past friday asks the week strip to follow`() {
        model.pagerDidScroll(state.todayIndex + 3)

        assertEquals(state.todayIndex / 5 + 1, state.visibleWeek)
        assertEquals(state.todayIndex / 5 + 1, state.stripRequest?.target)
        assertNull(state.pagerRequest)
        assertEquals(DayOfWeek.MONDAY, state.selectedDay.dayOfWeek)
        assertFalse(state.isShowingToday)
    }

    @Test
    fun `swiping the week strip keeps the weekday and moves the pager`() {
        model.stripDidScroll(state.visibleWeek - 1)

        assertEquals(state.todayIndex - 5, state.selectedIndex)
        assertEquals(state.todayIndex - 5, state.pagerRequest?.target)
        assertNull(state.stripRequest)
        assertEquals(DayOfWeek.WEDNESDAY, state.selectedDay.dayOfWeek)
    }

    @Test
    fun `reports matching the current position are ignored`() {
        model.pagerDidScroll(state.todayIndex + 3)
        val request = state.stripRequest

        model.stripDidScroll(state.visibleWeek)

        assertEquals(request, state.stripRequest)
        assertNull(state.pagerRequest)
        assertEquals(state.todayIndex + 3, state.selectedIndex)
    }

    @Test
    fun `tapping a day and going back to today move both pagers when needed`() {
        model.select(state.todayIndex - 2)
        assertEquals(state.todayIndex - 2, state.pagerRequest?.target)
        assertNull(state.stripRequest)

        model.goToToday()
        assertEquals(state.todayIndex, state.selectedIndex)
        assertEquals(state.todayIndex, state.pagerRequest?.target)

        model.select(0)
        assertEquals(0, state.visibleWeek)
        assertEquals(0, state.stripRequest?.target)
    }

    @Test
    fun `repeated requests to the same target are distinct`() {
        model.select(state.todayIndex + 1)
        val first = state.pagerRequest
        model.pagerDidScroll(state.todayIndex)
        model.select(state.todayIndex + 1)

        assertEquals(first?.target, state.pagerRequest?.target)
        assertNotEquals(first, state.pagerRequest)
    }
}
