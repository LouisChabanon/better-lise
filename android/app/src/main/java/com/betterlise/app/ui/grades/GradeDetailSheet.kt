package com.betterlise.app.ui.grades

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.betterlise.app.data.api.Grade
import com.betterlise.app.data.api.GradeStats
import com.betterlise.app.domain.GradeSorting
import com.betterlise.app.ui.components.ErrorBanner
import com.betterlise.app.ui.components.Loadable
import com.betterlise.app.ui.components.SurfaceCard
import com.betterlise.app.ui.theme.AppTheme
import com.betterlise.app.ui.theme.NumberStyle

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GradeDetailSheet(grade: Grade, stats: Loadable<GradeStats>, onRetry: () -> Unit, onDismiss: () -> Unit) {
    ModalBottomSheet(onDismissRequest = onDismiss, containerColor = MaterialTheme.colorScheme.background) {
        Column(
            Modifier
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp)
                .padding(bottom = 24.dp)
                .navigationBarsPadding(),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Header(grade)
            when (stats) {
                is Loadable.Loaded -> {
                    StatsGrid(stats.value)
                    Distribution(stats.value, grade)
                }
                is Loadable.Failed -> ErrorBanner(stats.message, onRetry = onRetry)
                else -> Box(Modifier.fillMaxWidth().height(160.dp), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            }
            if (grade.teachers.isNotBlank() || grade.comment.isNotBlank()) {
                SurfaceCard {
                    if (grade.teachers.isNotBlank()) Text("Intervenants : ${grade.teachers}", style = MaterialTheme.typography.bodyMedium)
                    if (grade.comment.isNotBlank()) Text("Commentaire : ${grade.comment}", style = MaterialTheme.typography.bodyMedium)
                }
            }
        }
    }
}

@Composable
private fun Header(grade: Grade) {
    val tone = AppTheme.colors.grade(grade.note)
    Row(verticalAlignment = Alignment.Top, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        Column(Modifier.weight(1f)) {
            Text(grade.libelle, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
            Text("${grade.date} · ${grade.code}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Column(
            Modifier.background(tone.background, RoundedCornerShape(18.dp)).padding(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(formatNote(grade.note), style = MaterialTheme.typography.headlineMedium.merge(NumberStyle), color = tone.foreground)
            Text("/20", style = MaterialTheme.typography.labelMedium, color = tone.foreground)
        }
    }
}

@Composable
private fun StatsGrid(stats: GradeStats) {
    val tiles = listOf(
        "Moyenne" to formatNote(stats.avg),
        "Médiane" to formatNote(stats.median),
        "Écart-type" to formatNote(stats.stdDeviation),
        "Min" to formatNote(stats.min),
        "Max" to formatNote(stats.max),
        "Notes" to stats.count.toString(),
    )
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        tiles.chunked(3).forEach { row ->
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                row.forEach { (label, value) ->
                    Column(
                        Modifier
                            .weight(1f)
                            .background(MaterialTheme.colorScheme.surface, RoundedCornerShape(14.dp))
                            .padding(vertical = 12.dp)
                            .semantics(mergeDescendants = true) {},
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        Text(value, style = MaterialTheme.typography.titleMedium.merge(NumberStyle))
                        Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
        }
    }
}

@Composable
private fun Distribution(stats: GradeStats, grade: Grade) {
    val counts = stats.distribution.counts
    val labels = stats.distribution.labels
    val userBin = GradeSorting.binIndex(grade.note, counts.size)
    val primary = MaterialTheme.colorScheme.primary
    val maxCount = (counts.maxOrNull() ?: 0).coerceAtLeast(1)

    SurfaceCard {
        Text("Répartition de la promo", style = MaterialTheme.typography.titleMedium)
        Canvas(
            Modifier
                .fillMaxWidth()
                .height(160.dp)
                .padding(top = 12.dp)
                .semantics {
                    contentDescription = labels.zip(counts).joinToString { (label, count) -> "$label : $count" }
                },
        ) {
            val gap = 6.dp.toPx()
            val barWidth = (size.width - gap * (counts.size - 1)) / counts.size
            counts.forEachIndexed { index, count ->
                val barHeight = size.height * count / maxCount
                drawRoundRect(
                    color = if (index == userBin) primary else primary.copy(alpha = 0.25f),
                    topLeft = Offset(index * (barWidth + gap), size.height - barHeight),
                    size = Size(barWidth, barHeight),
                    cornerRadius = CornerRadius(4.dp.toPx()),
                )
            }
        }
        Row(Modifier.fillMaxWidth().padding(top = 4.dp)) {
            labels.forEach {
                Text(
                    it.substringBefore("-"),
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.weight(1f),
                )
            }
        }
        Text(
            "Ta tranche est mise en évidence. Statistiques calculées à partir des utilisateurs de Better Lise.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(top = 8.dp),
        )
    }
}
