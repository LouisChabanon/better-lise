package com.betterlise.app.data.health

import com.betterlise.app.data.api.LiseHealth
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/** Tracks how fast Lise currently answers so loading screens can pace themselves on reality. */
class LiseHealthMonitor(
    private val fetch: suspend () -> LiseHealth,
    private val clock: () -> Long = System::currentTimeMillis,
) {
    private val _health = MutableStateFlow<LiseHealth?>(null)
    val health: StateFlow<LiseHealth?> = _health.asStateFlow()
    private var fetchedAt: Long? = null

    suspend fun refreshIfNeeded() {
        val now = clock()
        fetchedAt?.let { if (now - it < REFRESH_INTERVAL_MS) return }
        fetchedAt = now
        // Pacing is cosmetic: keep the previous estimate if the server can't be reached
        try {
            _health.value = fetch()
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            return
        }
    }

    companion object {
        const val DEFAULT_DURATION_SECONDS = 10.0
        private const val MINIMUM_SAMPLES = 4
        private const val REFRESH_INTERVAL_MS = 5 * 60 * 1000L
        private const val SLOW_THRESHOLD_SECONDS = 15.0

        fun expectedDurationSeconds(health: LiseHealth?): Double {
            if (health == null || health.count < MINIMUM_SAMPLES || health.avgDuration <= 0) return DEFAULT_DURATION_SECONDS
            return (health.avgDuration / 1000).coerceIn(3.0, 60.0)
        }

        fun slowNotice(health: LiseHealth?): String? {
            if (health == null || health.count < MINIMUM_SAMPLES) return null
            val seconds = health.avgDuration / 1000
            if (seconds <= SLOW_THRESHOLD_SECONDS) return null
            return "Lise est lente en ce moment (≈ ${seconds.toInt()} s par synchronisation)."
        }
    }
}
