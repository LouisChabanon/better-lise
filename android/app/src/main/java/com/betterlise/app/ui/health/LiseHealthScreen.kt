package com.betterlise.app.ui.health

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.rounded.Bolt
import androidx.compose.material.icons.automirrored.rounded.HelpOutline
import androidx.compose.material.icons.rounded.HourglassBottom
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.betterlise.app.data.api.HealthBucket
import com.betterlise.app.data.api.LiseHealth
import com.betterlise.app.data.api.LiseHealthStatus
import com.betterlise.app.data.health.LiseHealthMonitor
import com.betterlise.app.ui.components.ErrorBanner
import com.betterlise.app.ui.components.SurfaceCard
import com.betterlise.app.ui.theme.AppTheme
import com.betterlise.app.ui.theme.NumberStyle
import com.betterlise.app.ui.theme.Tone
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.launch
import java.text.NumberFormat
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

private const val SLOW_SECONDS = 15.0
private const val VERY_SLOW_SECONDS = 20.0
private val HOUR_LABEL = DateTimeFormatter.ofPattern("HH'h'", Locale.FRENCH)

internal fun LiseHealthStatus.label() = when (this) {
    LiseHealthStatus.Unknown -> "Données insuffisantes"
    LiseHealthStatus.Ok -> "Opérationnel"
    LiseHealthStatus.Slow -> "Lent"
    LiseHealthStatus.VerySlow -> "Très lent"
}

internal fun LiseHealthStatus.detail() = when (this) {
    LiseHealthStatus.Unknown -> "Pas assez de synchronisations ces deux dernières heures pour évaluer."
    LiseHealthStatus.Ok -> "Lise répond normalement."
    LiseHealthStatus.Slow -> "Temps de réponse supérieur à la normale."
    LiseHealthStatus.VerySlow -> "Le serveur Lise est très lent."
}

/** How fast Lise answers right now and over the last 24 hours, measured by Better Lise syncs. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LiseHealthScreen(monitor: LiseHealthMonitor, onBack: () -> Unit) {
    val health by monitor.health.collectAsStateWithLifecycle()
    var error by remember { mutableStateOf<String?>(null) }
    var isRefreshing by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val refresh: () -> Unit = {
        scope.launch {
            isRefreshing = true
            error = try {
                monitor.refresh()
                null
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                "Statut indisponible : ${e.message}"
            }
            isRefreshing = false
        }
    }
    LaunchedEffect(Unit) { refresh() }

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        topBar = {
            TopAppBar(
                title = { Text("Statut de Lise") },
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Rounded.ArrowBack, contentDescription = "Retour") } },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.background),
            )
        },
    ) { padding ->
        PullToRefreshBox(isRefreshing = isRefreshing, onRefresh = refresh, modifier = Modifier.padding(padding).fillMaxSize()) {
            Column(
                Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                error?.let { ErrorBanner(it, onRetry = refresh) }
                val current = health
                if (current != null) {
                    StatusCard(current)
                    current.hourly?.takeIf { it.isNotEmpty() }?.let { HistoryCard(it) }
                } else if (error == null) {
                    Box(Modifier.fillMaxWidth().heightIn(min = 200.dp), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
                }
                Text(
                    "Ces mesures viennent des synchronisations de notes des utilisateurs de Better Lise : quand Lise est lente, elles le sont aussi.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

@Composable
private fun statusTone(status: LiseHealthStatus): Tone = when (status) {
    LiseHealthStatus.Unknown -> Tone(MaterialTheme.colorScheme.background, MaterialTheme.colorScheme.onSurfaceVariant)
    LiseHealthStatus.Ok -> AppTheme.colors.success
    LiseHealthStatus.Slow -> AppTheme.colors.warning
    LiseHealthStatus.VerySlow -> AppTheme.colors.danger
}

private fun seconds(milliseconds: Double): String =
    NumberFormat.getNumberInstance(Locale.FRENCH).apply { minimumFractionDigits = 1; maximumFractionDigits = 1 }.format(milliseconds / 1000) + " s"

@Composable
private fun StatusCard(health: LiseHealth) {
    val status = health.liseStatus
    val tone = statusTone(status)
    SurfaceCard {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Box(Modifier.size(48.dp).background(tone.background, CircleShape), contentAlignment = Alignment.Center) {
                Icon(
                    when (status) {
                        LiseHealthStatus.Unknown -> Icons.AutoMirrored.Rounded.HelpOutline
                        LiseHealthStatus.Ok -> Icons.Rounded.Bolt
                        else -> Icons.Rounded.HourglassBottom
                    },
                    contentDescription = null,
                    tint = tone.foreground,
                )
            }
            Column {
                Text(status.label(), style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.ExtraBold)
                Text(status.detail(), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
        Row(Modifier.fillMaxWidth().padding(top = 14.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Figure(if (status == LiseHealthStatus.Unknown) "–" else seconds(health.avgDuration), "par synchro (2 h)", Modifier.weight(1f))
            Figure("${health.count}", "réussies (2 h)", Modifier.weight(1f))
            health.hourly?.let { hourly -> Figure("${hourly.sumOf { it.failures }}", "échecs (24 h)", Modifier.weight(1f)) }
        }
    }
}

@Composable
private fun Figure(value: String, label: String, modifier: Modifier) {
    Column(modifier) {
        Text(value, style = MaterialTheme.typography.titleLarge.merge(NumberStyle))
        Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
private fun HistoryCard(buckets: List<HealthBucket>) {
    val primary = MaterialTheme.colorScheme.primary
    val warning = AppTheme.colors.warning.foreground
    val danger = AppTheme.colors.danger.foreground
    val grid = MaterialTheme.colorScheme.surfaceVariant
    val maxSeconds = maxOf(buckets.maxOf { it.avgDuration } / 1000, VERY_SLOW_SECONDS + 2)
    val zone = ZoneId.systemDefault()

    SurfaceCard {
        Text("Dernières 24 heures", style = MaterialTheme.typography.titleMedium)
        Canvas(
            Modifier
                .fillMaxWidth()
                .height(180.dp)
                .padding(top = 12.dp)
                .semantics {
                    contentDescription = "Sur 24 heures : ${buckets.sumOf { it.count }} synchronisations réussies et ${buckets.sumOf { it.failures }} échecs."
                },
        ) {
            val markerSpace = 10.dp.toPx()
            val chartHeight = size.height - markerSpace
            val gap = 3.dp.toPx()
            val barWidth = (size.width - gap * (buckets.size - 1)) / buckets.size
            val thresholdY = chartHeight * (1 - (SLOW_SECONDS / maxSeconds)).toFloat()
            drawLine(warning.copy(alpha = 0.6f), Offset(0f, thresholdY), Offset(size.width, thresholdY), 1.dp.toPx(), pathEffect = PathEffect.dashPathEffect(floatArrayOf(8f, 8f)))
            drawLine(grid, Offset(0f, chartHeight), Offset(size.width, chartHeight), 1.dp.toPx())
            buckets.forEachIndexed { index, bucket ->
                val secondsValue = bucket.avgDuration / 1000
                val left = index * (barWidth + gap)
                val barHeight = (chartHeight * secondsValue / maxSeconds).toFloat()
                if (barHeight > 0) {
                    drawRoundRect(
                        color = when {
                            secondsValue > VERY_SLOW_SECONDS -> danger
                            secondsValue > SLOW_SECONDS -> warning
                            else -> primary
                        },
                        topLeft = Offset(left, chartHeight - barHeight),
                        size = Size(barWidth, barHeight),
                        cornerRadius = CornerRadius(3.dp.toPx()),
                    )
                }
                if (bucket.failures > 0) {
                    val centerX = left + barWidth / 2
                    val triangle = Path().apply {
                        moveTo(centerX, size.height - markerSpace + 2.dp.toPx())
                        lineTo(centerX + 4.dp.toPx(), size.height)
                        lineTo(centerX - 4.dp.toPx(), size.height)
                        close()
                    }
                    drawPath(triangle, danger)
                }
            }
        }
        Row(Modifier.fillMaxWidth().padding(top = 4.dp), horizontalArrangement = Arrangement.SpaceBetween) {
            listOf(0, 6, 12, 18, buckets.lastIndex).distinct().forEach { index ->
                Text(
                    HOUR_LABEL.format(buckets[index].hour.atZone(zone)),
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
        Text(
            "Barres : durée moyenne · pointillés : seuil « lent » (15 s) · ▲ : échecs",
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(top = 8.dp),
        )
    }
}
