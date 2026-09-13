package com.betterlise.app.ui.absences

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.EventBusy
import androidx.compose.material.icons.rounded.Schedule
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.betterlise.app.data.api.Absence
import com.betterlise.app.data.api.AbsenceStat
import com.betterlise.app.ui.components.ErrorBanner
import com.betterlise.app.ui.components.SignInPrompt
import com.betterlise.app.ui.components.SurfaceCard
import com.betterlise.app.ui.components.errorMessage
import com.betterlise.app.ui.components.isLoading
import com.betterlise.app.ui.theme.AppTheme
import com.betterlise.app.ui.theme.NumberStyle
import java.util.Locale

/** Above this share of unjustified absences the UE goes to revalidation. */
private const val REVALIDATION_THRESHOLD = 20.0

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AbsencesScreen(viewModel: AbsencesViewModel, onSignIn: () -> Unit) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        topBar = {
            TopAppBar(
                title = { Text("Absences") },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.background),
            )
        },
    ) { padding ->
        Box(Modifier.padding(padding).fillMaxSize()) {
            if (!state.isSignedIn) {
                SignInPrompt("Absences", onSignIn)
                return@Box
            }
            val data = state.absences.value
            PullToRefreshBox(isRefreshing = state.absences.isLoading && data != null, onRefresh = viewModel::refresh) {
                LazyColumn(
                    Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    state.absences.errorMessage?.let { item { ErrorBanner(it, onRetry = viewModel::refresh) } }
                    if (data == null) {
                        if (state.absences.isLoading) {
                            item {
                                Box(Modifier.fillMaxWidth().padding(top = 80.dp), contentAlignment = Alignment.Center) {
                                    CircularProgressIndicator()
                                }
                            }
                        }
                        return@LazyColumn
                    }
                    item {
                        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            SummaryTile(Icons.Rounded.EventBusy, data.nbTotalAbsences.toString(), "absences", Modifier.weight(1f))
                            SummaryTile(Icons.Rounded.Schedule, data.dureeTotaleAbsences, "au total", Modifier.weight(1f))
                        }
                    }
                    item {
                        Column(Modifier.padding(top = 8.dp)) {
                            Text("Par UE", style = MaterialTheme.typography.titleLarge)
                            Text(
                                "Part d'absences non justifiées. Au-delà de 20 %, la revalidation est automatique. Ceci est une estimation : vérifie sur Lise.",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                    if (data.stats.isEmpty()) {
                        item { SurfaceCard { Text("Aucune absence non justifiée rattachée à une UE.") } }
                    }
                    data.stats.forEach { stat -> item(key = stat.code) { StatCard(stat) } }
                    if (data.absences.isNotEmpty()) {
                        item { Text("Historique", style = MaterialTheme.typography.titleLarge, modifier = Modifier.padding(top = 8.dp)) }
                        item {
                            SurfaceCard {
                                data.absences.forEachIndexed { index, absence ->
                                    AbsenceRow(absence)
                                    if (index < data.absences.lastIndex) HorizontalDivider()
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun SummaryTile(icon: ImageVector, value: String, label: String, modifier: Modifier) {
    Column(
        modifier
            .background(MaterialTheme.colorScheme.surface, RoundedCornerShape(20.dp))
            .padding(16.dp)
            .semantics(mergeDescendants = true) {},
    ) {
        Icon(icon, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
        Text(value, style = MaterialTheme.typography.headlineMedium.merge(NumberStyle), maxLines = 1, modifier = Modifier.padding(top = 8.dp))
        Text(label, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
private fun StatCard(stat: AbsenceStat) {
    val tone = AppTheme.colors.absence(stat.percentage)
    SurfaceCard {
        Row(verticalAlignment = Alignment.Top) {
            Column(Modifier.weight(1f)) {
                Text(stat.name, style = MaterialTheme.typography.titleMedium)
                Text(stat.code, style = MaterialTheme.typography.labelSmall, fontFamily = FontFamily.Monospace, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Text(
                String.format(Locale.FRENCH, "%.1f %%", stat.percentage),
                style = MaterialTheme.typography.labelLarge,
                fontWeight = FontWeight.Bold,
                color = tone.foreground,
                modifier = Modifier.background(tone.background, RoundedCornerShape(50)).padding(horizontal = 8.dp, vertical = 4.dp),
            )
        }
        BoxWithConstraints(
            Modifier
                .fillMaxWidth()
                .padding(vertical = 10.dp)
                .height(8.dp)
                .clip(RoundedCornerShape(50))
                .background(MaterialTheme.colorScheme.surfaceVariant),
        ) {
            Box(Modifier.fillMaxHeight().width(maxWidth * (stat.percentage.coerceIn(0.0, 100.0) / 100).toFloat()).background(tone.foreground))
            Box(
                Modifier
                    .offset(x = maxWidth * (REVALIDATION_THRESHOLD / 100).toFloat())
                    .fillMaxHeight()
                    .width(2.dp)
                    .background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.35f)),
            )
        }
        Row {
            Text(
                "Absent : ${String.format(Locale.FRENCH, "%.1f", stat.absentHours)} h",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.weight(1f),
            )
            Text("Module : ${stat.totalUE.toInt()} h", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun AbsenceRow(absence: Absence) {
    val motif = absence.motif.trim().lowercase()
    val justified = motif.isNotEmpty() && motif != "non excusé" && motif != "non excuse"
    val tone = if (justified) AppTheme.colors.success else AppTheme.colors.danger
    Row(Modifier.padding(vertical = 10.dp).semantics(mergeDescendants = true) {}, verticalAlignment = Alignment.Top) {
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
            Text(absence.matiere.ifBlank { absence.cours }, style = MaterialTheme.typography.titleSmall)
            Text("${absence.date} · ${absence.horaire}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text(
                if (justified) absence.motif else "Non justifiée",
                style = MaterialTheme.typography.labelSmall,
                color = tone.foreground,
                modifier = Modifier.background(tone.background, RoundedCornerShape(50)).padding(horizontal = 6.dp, vertical = 2.dp),
            )
        }
        Text(absence.duree, style = MaterialTheme.typography.bodyMedium.merge(NumberStyle))
    }
}
