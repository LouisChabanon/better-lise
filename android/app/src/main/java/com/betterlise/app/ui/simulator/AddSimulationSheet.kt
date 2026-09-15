package com.betterlise.app.ui.simulator

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.Remove
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilledTonalIconButton
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Slider
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.runtime.mutableDoubleStateOf
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.betterlise.app.domain.ClassCodeParser
import com.betterlise.app.domain.CoefficientInput
import com.betterlise.app.ui.grades.formatNote
import com.betterlise.app.ui.theme.AppTheme
import com.betterlise.app.ui.theme.NumberStyle

@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun AddSimulationSheet(
    classes: List<String>,
    onAdd: (name: String, grade: Double, coeff: Double, classCode: String) -> Unit,
    onDismiss: () -> Unit,
) {
    var classCode by remember { mutableStateOf(classes.firstOrNull() ?: ClassCodeParser.UNASSIGNED) }
    var name by remember { mutableStateOf("") }
    var grade by remember { mutableDoubleStateOf(10.0) }
    var coeffText by remember { mutableStateOf(formatNote(1.0)) }
    val coeff = CoefficientInput.parse(coeffText)

    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)) {
        Column(
            Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(horizontal = 20.dp).padding(bottom = 16.dp).navigationBarsPadding(),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Text("Note simulée", style = MaterialTheme.typography.titleLarge)
            Text("UE", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                items(classes) { option ->
                    FilterChip(selected = option == classCode, onClick = { classCode = option }, label = { Text(option) })
                }
            }
            OutlinedTextField(
                value = name,
                onValueChange = { name = it },
                placeholder = { Text("Nom (ex : Rattrapage…)") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )
            Text("Note", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Slider(
                    value = grade.toFloat(),
                    onValueChange = { grade = (it * 2).toInt() / 2.0 },
                    valueRange = 0f..20f,
                    steps = 39,
                    modifier = Modifier.weight(1f),
                )
                Text(
                    formatNote(grade),
                    style = MaterialTheme.typography.titleLarge.merge(NumberStyle),
                    color = AppTheme.colors.grade(grade).foreground,
                    textAlign = TextAlign.End,
                    modifier = Modifier.widthIn(min = 56.dp),
                )
            }
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Coefficient", style = MaterialTheme.typography.titleSmall, modifier = Modifier.weight(1f))
                FilledTonalIconButton(onClick = { coeffText = formatNote(CoefficientInput.stepped(coeff, -CoefficientInput.STEP)) }) {
                    Icon(Icons.Rounded.Remove, contentDescription = "Diminuer le coefficient")
                }
                OutlinedTextField(
                    value = coeffText,
                    onValueChange = { coeffText = it },
                    singleLine = true,
                    isError = coeff == null,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    textStyle = MaterialTheme.typography.titleMedium.merge(NumberStyle).copy(textAlign = TextAlign.Center),
                    modifier = Modifier.width(88.dp).testTag("simulationCoeff"),
                )
                FilledTonalIconButton(onClick = { coeffText = formatNote(CoefficientInput.stepped(coeff, CoefficientInput.STEP)) }) {
                    Icon(Icons.Rounded.Add, contentDescription = "Augmenter le coefficient")
                }
            }
            Text(
                if (coeff == null) {
                    "Coefficient invalide : un nombre entre 0 et ${CoefficientInput.MAXIMUM.toInt()}, par exemple 1,33."
                } else {
                    "Retrouvez les coefficients de vos épreuves sur Savoir (ex : 1,33)."
                },
                style = MaterialTheme.typography.bodySmall,
                color = if (coeff == null) AppTheme.colors.danger.foreground else MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Button(
                onClick = {
                    coeff?.let { onAdd(name, grade, it, classCode) }
                    onDismiss()
                },
                enabled = coeff != null,
                modifier = Modifier.fillMaxWidth().testTag("confirmSimulation"),
            ) { Text("Ajouter la note simulée") }
        }
    }
}
