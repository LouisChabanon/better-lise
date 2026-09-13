package com.betterlise.app.ui.loading

import kotlin.math.exp

/**
 * Estimated progress of a Lise scrape. The server gives no real progress, so the curve eases
 * towards 95 % around the expected duration, then crawls without ever reaching 100 % on its own.
 */
class ScraperProgress(private val expectedDurationSeconds: Double) {
    fun progress(elapsedSeconds: Double): Double {
        val t = elapsedSeconds.coerceAtLeast(0.0)
        // ~90 % reached at the expected duration (1 - e^-2.5 ≈ 0.92 of the eased range)
        val timeConstant = expectedDurationSeconds.coerceAtLeast(1.0) / 2.5
        val eased = START + (EASED_TARGET - START) * (1 - exp(-t / timeConstant))
        val overtime = (t - expectedDurationSeconds * 1.5).coerceAtLeast(0.0)
        val crawl = (overtime * 0.1).coerceAtMost(CEILING - EASED_TARGET)
        return (eased + crawl).coerceAtMost(CEILING)
    }

    companion object {
        /** Same phases as the web app (hooks/useScraperLoading.ts). */
        val PHASES = listOf(
            10.0 to "Initialisation...",
            25.0 to "Préparation de la requête...",
            35.0 to "Contact du serveur...",
            50.0 to "Connexion à LISE...",
            60.0 to "Navigation dans l'interface...",
            75.0 to "Récupération des données...",
            90.0 to "Finalisation de l'analyse...",
        )

        private const val START = 5.0
        private const val EASED_TARGET = 95.0
        private const val CEILING = 99.0

        fun message(progress: Double): String =
            PHASES.firstOrNull { (threshold, _) -> threshold > progress }?.second ?: PHASES.last().second

        /**
         * Vertical position of the scanning laser (0…1). Unlike the web (which completes at 70 %), the
         * scan spans the whole eased range so the page never looks finished while Lise is still working.
         */
        fun scanFraction(progress: Double): Double = ((progress - 10) / 85).coerceIn(0.0, 1.0)
    }
}

/** Lifecycle of a Lise sync, driving the loading UI. */
sealed interface SyncState {
    data object Idle : SyncState
    data class Syncing(val startedAtMs: Long, val hasContent: Boolean) : SyncState
    data class Finished(val startedAtMs: Long, val hasContent: Boolean) : SyncState

    /** Nothing to show yet: the full loading animation replaces the screen. */
    val showsFullLoader: Boolean
        get() = (this is Syncing && !hasContent) || (this is Finished && !hasContent)

    /** Cached content is visible: a compact progress pill floats above it. */
    val showsCompactLoader: Boolean
        get() = (this is Syncing && hasContent) || (this is Finished && hasContent)

    /** When the running (or just finished) sync started, in epoch milliseconds. */
    val startTimeMs: Long?
        get() = when (this) {
            Idle -> null
            is Syncing -> startedAtMs
            is Finished -> startedAtMs
        }

    companion object {
        /** How long "Terminé" stays on screen once Lise answered (same as the web app). */
        const val COMPLETION_DISPLAY_MS = 800L
    }
}

