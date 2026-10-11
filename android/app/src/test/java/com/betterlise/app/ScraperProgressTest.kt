package com.betterlise.app

import com.betterlise.app.data.api.LiseHealth
import com.betterlise.app.data.health.LiseHealthMonitor
import com.betterlise.app.ui.loading.ScraperProgress
import com.betterlise.app.ui.loading.SyncState
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class ScraperProgressTest {
    private val estimator = ScraperProgress(expectedDurationSeconds = 12.0)

    @Test
    fun `starts low and never reaches one hundred on its own`() {
        assertEquals(5.0, estimator.progress(0.0), 0.0001)
        assertEquals(5.0, estimator.progress(-3.0), 0.0001)
        assertTrue(estimator.progress(10_000.0) <= 99.0)
    }

    @Test
    fun `is monotonic and calibrated on the expected duration`() {
        val samples = (0..120).map { estimator.progress(it * 0.5) }
        assertTrue(samples.zipWithNext().all { (a, b) -> a <= b })
        assertTrue(estimator.progress(12.0) in 85.0..93.0)
        assertTrue(estimator.progress(3.0) < 60.0)
    }

    @Test
    fun `messages follow the web phases`() {
        assertEquals("Initialisation...", ScraperProgress.message(0.0))
        assertEquals("Initialisation...", ScraperProgress.message(9.9))
        assertEquals("Préparation de la requête...", ScraperProgress.message(10.0))
        assertEquals("Connexion à LISE...", ScraperProgress.message(40.0))
        assertEquals("Récupération des données...", ScraperProgress.message(74.0))
        assertEquals("Finalisation de l'analyse...", ScraperProgress.message(95.0))
    }

    @Test
    fun `scan spans the whole eased range`() {
        assertEquals(0.0, ScraperProgress.scanFraction(5.0), 0.0001)
        assertEquals(0.5, ScraperProgress.scanFraction(52.5), 0.0001)
        assertEquals(1.0, ScraperProgress.scanFraction(95.0), 0.0001)
        assertEquals(1.0, ScraperProgress.scanFraction(99.0), 0.0001)
    }

    @Test
    fun `expected duration comes from recent lise health`() {
        val default = LiseHealthMonitor.DEFAULT_DURATION_SECONDS
        assertEquals(default, LiseHealthMonitor.expectedDurationSeconds(null), 0.0)
        assertEquals(default, LiseHealthMonitor.expectedDurationSeconds(LiseHealth(25_000.0, 2)), 0.0)
        assertEquals(25.0, LiseHealthMonitor.expectedDurationSeconds(LiseHealth(25_000.0, 12)), 0.0)
        assertEquals(3.0, LiseHealthMonitor.expectedDurationSeconds(LiseHealth(500.0, 12)), 0.0)
        assertEquals(60.0, LiseHealthMonitor.expectedDurationSeconds(LiseHealth(400_000.0, 12)), 0.0)
    }

    @Test
    fun `warns only when lise is reliably slow`() {
        assertNull(LiseHealthMonitor.slowNotice(LiseHealth(8_000.0, 12)))
        assertNull(LiseHealthMonitor.slowNotice(LiseHealth(30_000.0, 2)))
        assertEquals(
            "Lise est lente en ce moment (≈ 22 s par synchronisation).",
            LiseHealthMonitor.slowNotice(LiseHealth(22_400.0, 12)),
        )
    }

    @Test
    fun `sync state decides between full and compact loaders`() {
        assertTrue(SyncState.Syncing(0, hasContent = false).showsFullLoader)
        assertTrue(SyncState.Finished(0, hasContent = false).showsFullLoader)
        assertTrue(SyncState.Syncing(0, hasContent = true).showsCompactLoader)
        assertFalse(SyncState.Idle.showsFullLoader || SyncState.Idle.showsCompactLoader)
    }
}
