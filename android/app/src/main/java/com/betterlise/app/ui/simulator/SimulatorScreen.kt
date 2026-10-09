package com.betterlise.app.ui.simulator

import androidx.compose.animation.animateContentSize
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.CalendarMonth
import androidx.compose.material.icons.rounded.CloudUpload
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.automirrored.rounded.Label
import androidx.compose.material.icons.rounded.Lightbulb
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.betterlise.app.domain.ClassCodeParser
import com.betterlise.app.domain.SimulatorGrouping
import com.betterlise.app.domain.SimulatorRealGrade
import com.betterlise.app.ui.components.EmptyState
import com.betterlise.app.ui.components.ErrorBanner

/** "Moyennes": what-if averages per UE, from the real grades plus simulated ones. */
@Composable
fun SimulatorContent(viewModel: SimulatorViewModel) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    var isHelpVisible by rememberSaveable { mutableStateOf(true) }
    var isAddVisible by remember { mutableStateOf(false) }
    var gradeToAssign by remember { mutableStateOf<SimulatorRealGrade?>(null) }
    val groups = state.groups

    Box(Modifier.fillMaxSize()) {
        LazyColumn(
            modifier = Modifier.fillMaxSize().testTag("simulator"),
            verticalArrangement = Arrangement.spacedBy(12.dp),
            contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 96.dp),
        ) {
            item { SemesterPicker(state.semester, state.availableSemesters, viewModel::selectSemester) }
            state.error?.let { message -> item { ErrorBanner(message, onRetry = viewModel::loadWeights) } }
            if (isHelpVisible) item { HelpCard(onDismiss = { isHelpVisible = false }) }
            items(groups, key = { it.classCode }) { group ->
                UECard(
                    group = group,
                    sharingCodes = state.sharingCodes,
                    onCoeffChange = viewModel::setLocalCoeff,
                    onShare = viewModel::shareCoeff,
                    onAssign = { gradeToAssign = it },
                    onSimulatedGradeChange = viewModel::setSimulatedGrade,
                    onRemoveSimulation = viewModel::removeSimulation,
                )
            }
            if (groups.isEmpty()) item { EmptyState("Aucune note", "Aucune note trouvée pour ce semestre.") }
        }
        ExtendedFloatingActionButton(
            onClick = { isAddVisible = true },
            icon = { Icon(Icons.Rounded.Add, contentDescription = null) },
            text = { Text("Note simulée") },
            modifier = Modifier.align(Alignment.BottomEnd).padding(16.dp).testTag("addSimulation"),
        )
    }

    if (isAddVisible) {
        AddSimulationSheet(
            classes = state.availableClasses,
            onAdd = viewModel::addSimulation,
            onDismiss = { isAddVisible = false },
        )
    }

    gradeToAssign?.let { grade ->
        AssignClassDialog(
            grade = grade,
            onAssign = { viewModel.assignClass(grade.code, it); gradeToAssign = null },
            onDismiss = { gradeToAssign = null },
        )
    }
}

@Composable
private fun SemesterPicker(semester: String, semesters: List<String>, onSelect: (String) -> Unit) {
    var expanded by remember { mutableStateOf(false) }
    val label = { value: String -> if (value == SimulatorGrouping.ALL_SEMESTERS) "Tous les semestres" else "Semestre ${value.drop(1)}" }
    Box {
        TextButton(onClick = { expanded = true }) {
            Icon(Icons.Rounded.CalendarMonth, contentDescription = null, modifier = Modifier.size(18.dp))
            Text(label(semester), fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(start = 8.dp))
        }
        DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            (semesters + SimulatorGrouping.ALL_SEMESTERS).forEach { option ->
                DropdownMenuItem(text = { Text(label(option)) }, onClick = { onSelect(option); expanded = false })
            }
        }
    }
}

@Composable
private fun HelpCard(onDismiss: () -> Unit) {
    Column(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(18.dp))
            .background(MaterialTheme.colorScheme.primaryContainer)
            .padding(14.dp)
            .animateContentSize(),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Rounded.Lightbulb, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
            Text(
                "Comment ça marche ?",
                style = MaterialTheme.typography.titleSmall,
                color = MaterialTheme.colorScheme.primary,
                modifier = Modifier.weight(1f).padding(start = 8.dp),
            )
            IconButton(onClick = onDismiss, modifier = Modifier.size(32.dp)) {
                Icon(Icons.Rounded.Close, contentDescription = "Masquer l'aide", modifier = Modifier.size(18.dp))
            }
        }
        Tip(Icons.Rounded.Add, "Simulez", "Ajoutez des notes hypothétiques pour voir leur impact sur la moyenne de l'UE.")
        Tip(Icons.Rounded.CloudUpload, "Participez", "Corrigez un coefficient (voir Savoir) puis partagez-le avec les autres étudiants.")
        Tip(Icons.AutoMirrored.Rounded.Label, "Organisez", "Une note « Non classée » ? Touchez son code pour l'assigner à la bonne UE.")
    }
}

@Composable
private fun Tip(icon: androidx.compose.ui.graphics.vector.ImageVector, title: String, text: String) {
    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        Icon(icon, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(18.dp))
        Text(
            androidx.compose.ui.text.buildAnnotatedString {
                pushStyle(androidx.compose.ui.text.SpanStyle(fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface))
                append("$title : ")
                pop()
                append(text)
            },
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun AssignClassDialog(grade: SimulatorRealGrade, onAssign: (String) -> Unit, onDismiss: () -> Unit) {
    var value by remember { mutableStateOf(ClassCodeParser.parse(grade.code).classCode) }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Assigner à une UE") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(grade.grade.libelle, style = MaterialTheme.typography.bodyMedium)
                OutlinedTextField(value = value, onValueChange = { value = it }, singleLine = true, label = { Text("Code de l'UE (ex : REPA)") })
            }
        },
        confirmButton = { TextButton(onClick = { onAssign(value) }) { Text("Assigner") } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Annuler") } },
    )
}
