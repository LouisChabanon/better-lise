package com.betterlise.app.ui.grades

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.EmojiEvents
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material3.IconButton
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.betterlise.app.data.api.Grade
import com.betterlise.app.ui.components.EmptyState
import com.betterlise.app.ui.components.ErrorBanner
import com.betterlise.app.ui.components.SignInPrompt
import com.betterlise.app.ui.components.errorMessage
import com.betterlise.app.data.health.LiseHealthMonitor
import com.betterlise.app.ui.loading.SyncAwareContent
import com.betterlise.app.ui.loading.SyncState
import com.betterlise.app.ui.components.isLoading
import com.betterlise.app.ui.grades.reveal.GradeRevealSheet
import com.betterlise.app.ui.simulator.SimulatorContent
import com.betterlise.app.ui.simulator.SimulatorViewModel
import com.betterlise.app.ui.theme.AppTheme
import com.betterlise.app.ui.theme.NumberStyle
import java.text.NumberFormat
import java.util.Locale

internal fun formatNote(value: Double): String =
    NumberFormat.getNumberInstance(Locale.FRENCH).apply { maximumFractionDigits = 2 }.format(value)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GradesScreen(
    viewModel: GradesViewModel,
    revealMode: Boolean,
    onSignIn: () -> Unit,
    simulator: SimulatorViewModel? = null,
    onOpenAchievements: (() -> Unit)? = null,
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    var showsSimulator by rememberSaveable { mutableStateOf(false) }

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        topBar = {
            TopAppBar(
                title = { Text(if (showsSimulator) "Moyennes" else "Notes") },
                actions = {
                    if (state.isSignedIn && onOpenAchievements != null) {
                        IconButton(onClick = onOpenAchievements) {
                            Icon(Icons.Rounded.EmojiEvents, contentDescription = "Succès")
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.background),
            )
        },
    ) { padding ->
        Box(Modifier.padding(padding).fillMaxSize()) {
            if (!state.isSignedIn) {
                SignInPrompt("Notes", onSignIn)
                return@Box
            }
            val health by viewModel.health.collectAsStateWithLifecycle()
            SyncAwareContent(
                sync = state.sync,
                expectedSeconds = LiseHealthMonitor.expectedDurationSeconds(health),
                slowNotice = LiseHealthMonitor.slowNotice(health),
            ) {
                Column {
                    if (simulator != null) {
                        ModeSwitch(showsSimulator, onChange = { showsSimulator = it })
                    }
                    if (showsSimulator && simulator != null) {
                        SimulatorContent(simulator)
                    } else {
                        // The pill reports sync progress, so the pull indicator only acknowledges the gesture
                        PullToRefreshBox(isRefreshing = false, onRefresh = viewModel::refresh) {
                            GradeList(state, viewModel, revealMode)
                        }
                    }
                }
            }
        }
    }

    state.selected?.let { grade ->
        GradeDetailSheet(
            grade = grade,
            stats = state.stats,
            onRetry = { viewModel.loadStats(grade) },
            onDismiss = viewModel::dismissDetail,
            onMarkAsNew = { viewModel.markNew(grade) },
        )
    }

    state.revealing?.let { grade ->
        GradeRevealSheet(
            grade = grade,
            onRevealed = viewModel::onRevealed,
            onComplete = viewModel::finishReveal,
            onDismiss = viewModel::dismissReveal,
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ModeSwitch(showsSimulator: Boolean, onChange: (Boolean) -> Unit) {
    SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp)) {
        listOf(false to "Notes", true to "Moyennes").forEachIndexed { index, (value, label) ->
            SegmentedButton(
                selected = showsSimulator == value,
                onClick = { onChange(value) },
                shape = SegmentedButtonDefaults.itemShape(index, 2),
            ) { Text(label) }
        }
    }
}

@Composable
private fun GradeList(state: GradesUiState, viewModel: GradesViewModel, revealMode: Boolean) {
    val grades = state.visibleGrades
    val unread = grades.filter { it.isUnread }
    val read = grades.filterNot { it.isUnread }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        verticalArrangement = Arrangement.spacedBy(8.dp),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(start = 16.dp, end = 16.dp, bottom = 24.dp),
    ) {
        item {
            OutlinedTextField(
                value = state.query,
                onValueChange = viewModel::onQueryChange,
                placeholder = { Text("Rechercher une matière") },
                leadingIcon = { Icon(Icons.Rounded.Search, contentDescription = null) },
                singleLine = true,
                shape = RoundedCornerShape(16.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    unfocusedContainerColor = MaterialTheme.colorScheme.surface,
                    focusedContainerColor = MaterialTheme.colorScheme.surface,
                    unfocusedBorderColor = MaterialTheme.colorScheme.surface,
                ),
                modifier = Modifier.fillMaxWidth(),
            )
        }
        state.grades.errorMessage?.let { message ->
            item { ErrorBanner(message, onRetry = viewModel::refresh) }
        }
        if (unread.isNotEmpty()) {
            item { SectionTitle("Nouvelles notes") }
            items(unread, key = { "new-${it.code}" }) {
                GradeRow(it, hidesNote = revealMode) { viewModel.onGradeTapped(it, revealMode) }
            }
        }
        if (read.isNotEmpty()) {
            item { SectionTitle(if (unread.isEmpty()) "Toutes les notes" else "Déjà consultées") }
            items(read, key = { it.code }) { GradeRow(it, hidesNote = false) { viewModel.onGradeTapped(it, revealMode) } }
        }
        if (grades.isEmpty() && state.sync == SyncState.Idle && state.grades.errorMessage == null) {
            item { EmptyState("Aucune note", if (state.query.isBlank()) "Tes notes apparaîtront ici." else "Aucun résultat pour « ${state.query} ».") }
        }
    }
}

@Composable
private fun SectionTitle(text: String) {
    Text(
        text.uppercase(),
        style = MaterialTheme.typography.labelMedium,
        fontWeight = FontWeight.Bold,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        modifier = Modifier.padding(top = 12.dp, bottom = 2.dp, start = 4.dp),
    )
}

@Composable
private fun GradeRow(grade: Grade, hidesNote: Boolean, onClick: () -> Unit) {
    val tone = AppTheme.colors.grade(grade.note)
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.surface, RoundedCornerShape(18.dp))
            .clickable(onClick = onClick)
            .padding(14.dp)
            .testTag(if (hidesNote) "hiddenGrade" else "grade")
            .semantics(mergeDescendants = true) {
                contentDescription = if (hidesNote) {
                    "${grade.libelle}, note à révéler"
                } else {
                    "${grade.libelle}, ${formatNote(grade.note)} sur 20" + if (grade.isUnread) ", nouvelle note" else ""
                }
            },
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Column(Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                if (grade.isUnread) Box(Modifier.size(8.dp).background(MaterialTheme.colorScheme.primary, CircleShape))
                Text(grade.libelle, style = MaterialTheme.typography.titleMedium, maxLines = 2, overflow = TextOverflow.Ellipsis)
            }
            Text(
                "${grade.date} · ${grade.code}",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
        if (hidesNote) {
            Text(
                "?",
                style = MaterialTheme.typography.titleLarge.merge(NumberStyle),
                color = MaterialTheme.colorScheme.onPrimary,
                textAlign = TextAlign.Center,
                modifier = Modifier
                    .widthIn(min = 56.dp)
                    .background(MaterialTheme.colorScheme.primary, RoundedCornerShape(12.dp))
                    .padding(horizontal = 8.dp, vertical = 8.dp),
            )
            return@Row
        }
        Text(
            formatNote(grade.note),
            style = MaterialTheme.typography.titleLarge.merge(NumberStyle),
            color = tone.foreground,
            textAlign = TextAlign.Center,
            modifier = Modifier
                .widthIn(min = 56.dp)
                .background(tone.background, RoundedCornerShape(12.dp))
                .padding(horizontal = 8.dp, vertical = 8.dp),
        )
    }
}
