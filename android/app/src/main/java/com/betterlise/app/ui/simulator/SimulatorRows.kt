package com.betterlise.app.ui.simulator

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowForward
import androidx.compose.material.icons.rounded.CloudUpload
import androidx.compose.material.icons.rounded.Delete
import androidx.compose.material.icons.rounded.Warning
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Slider
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.betterlise.app.domain.ClassCodeParser
import com.betterlise.app.domain.SimulatedGrade
import com.betterlise.app.domain.SimulatorRealGrade
import com.betterlise.app.domain.UEGroup
import com.betterlise.app.ui.grades.formatNote
import com.betterlise.app.ui.theme.AppTheme
import com.betterlise.app.ui.theme.NumberStyle
import java.text.NumberFormat
import java.util.Locale

internal fun formatAverage(value: Double): String =
    NumberFormat.getNumberInstance(Locale.FRENCH).apply { minimumFractionDigits = 2; maximumFractionDigits = 2 }.format(value)

internal fun formatDelta(value: Double): String = (if (value >= 0) "+" else "") + formatAverage(value)

/** Accepts "1,5" as well as "1.5". */
internal fun parseDecimal(text: String): Double? = text.trim().replace(',', '.').toDoubleOrNull()

@Composable
internal fun UECard(
    group: UEGroup,
    sharingCodes: Set<String>,
    onCoeffChange: (String, Double) -> Unit,
    onShare: (SimulatorRealGrade) -> Unit,
    onAssign: (SimulatorRealGrade) -> Unit,
    onSimulatedGradeChange: (String, Double) -> Unit,
    onRemoveSimulation: (String) -> Unit,
) {
    Column(
        Modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.surface, RoundedCornerShape(20.dp))
            .padding(vertical = 14.dp),
    ) {
        UESummary(group, Modifier.padding(horizontal = 16.dp))
        group.real.forEach { grade ->
            HorizontalDivider(Modifier.padding(start = 16.dp, top = 10.dp), color = MaterialTheme.colorScheme.surfaceVariant)
            RealGradeRow(
                grade = grade,
                isSharing = grade.code in sharingCodes,
                onCoeffChange = { onCoeffChange(grade.code, it) },
                onShare = { onShare(grade) },
                onAssign = { onAssign(grade) },
            )
        }
        group.simulations.forEach { simulation ->
            SimulatedGradeRow(
                simulation = simulation,
                onChange = { onSimulatedGradeChange(simulation.id, it) },
                onRemove = { onRemoveSimulation(simulation.id) },
            )
        }
    }
}

@Composable
private fun UESummary(group: UEGroup, modifier: Modifier = Modifier) {
    val current = group.currentAverage
    val projected = group.projectedAverage
    val delta = projected - current
    Column(modifier.semantics(mergeDescendants = true) {}, verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(
                group.classCode,
                style = MaterialTheme.typography.titleLarge,
                color = if (group.classCode == ClassCodeParser.UNASSIGNED) AppTheme.colors.warning.foreground else MaterialTheme.colorScheme.onSurface,
            )
            if (group.semester != group.classCode) {
                Text(
                    group.semester,
                    style = MaterialTheme.typography.labelMedium.copy(fontFamily = FontFamily.Monospace),
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.background(MaterialTheme.colorScheme.background, CircleShape).padding(horizontal = 8.dp, vertical = 2.dp),
                )
            }
        }
        Row(verticalAlignment = Alignment.Bottom) {
            Metric("Moyenne", formatAverage(current), MaterialTheme.colorScheme.onSurface)
            if (group.hasSimulations) {
                val tone = if (delta >= 0) AppTheme.colors.success else AppTheme.colors.danger
                Icon(
                    Icons.AutoMirrored.Rounded.ArrowForward,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp).size(18.dp),
                )
                Metric("Projetée", formatAverage(projected), tone.foreground)
                Box(Modifier.weight(1f), contentAlignment = Alignment.CenterEnd) {
                    Text(
                        formatDelta(delta),
                        style = MaterialTheme.typography.labelLarge.merge(NumberStyle),
                        color = tone.foreground,
                        modifier = Modifier
                            .padding(bottom = 6.dp)
                            .background(tone.background, CircleShape)
                            .padding(horizontal = 10.dp, vertical = 4.dp)
                            .testTag("projectionDelta"),
                    )
                }
            }
        }
    }
}

@Composable
private fun Metric(label: String, value: String, color: androidx.compose.ui.graphics.Color) {
    Column {
        Text(
            label.uppercase(),
            style = MaterialTheme.typography.labelSmall,
            fontWeight = FontWeight.Bold,
            letterSpacing = 0.6.sp,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Text(value, style = MaterialTheme.typography.headlineMedium.merge(NumberStyle), color = color)
    }
}

@Composable
private fun RealGradeRow(
    grade: SimulatorRealGrade,
    isSharing: Boolean,
    onCoeffChange: (Double) -> Unit,
    onShare: () -> Unit,
    onAssign: () -> Unit,
) {
    val isUnassigned = ClassCodeParser.parse(grade.code).classCode == ClassCodeParser.UNASSIGNED
    Row(
        Modifier.fillMaxWidth().padding(start = 16.dp, end = 16.dp, top = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Column(Modifier.weight(1f)) {
            Text(grade.grade.libelle, style = MaterialTheme.typography.titleSmall, maxLines = 2, overflow = TextOverflow.Ellipsis)
            Row(
                Modifier.clickable(onClick = onAssign).padding(vertical = 2.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                if (isUnassigned) {
                    Icon(Icons.Rounded.Warning, contentDescription = null, tint = AppTheme.colors.warning.foreground, modifier = Modifier.size(14.dp))
                }
                Text(
                    if (isUnassigned) "Non classée · assigner" else grade.code,
                    style = if (isUnassigned) MaterialTheme.typography.labelMedium else MaterialTheme.typography.labelSmall.copy(fontFamily = FontFamily.Monospace),
                    color = if (isUnassigned) AppTheme.colors.warning.foreground else MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }
        Box(Modifier.size(40.dp), contentAlignment = Alignment.Center) {
            when {
                isSharing -> CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp)
                grade.canShare -> IconButton(onClick = onShare) {
                    Icon(Icons.Rounded.CloudUpload, contentDescription = "Partager le coefficient", tint = MaterialTheme.colorScheme.primary)
                }
            }
        }
        CoeffField(grade, onCoeffChange)
        val tone = AppTheme.colors.grade(grade.grade.note)
        Text(
            formatNote(grade.grade.note),
            style = MaterialTheme.typography.titleMedium.merge(NumberStyle),
            color = tone.foreground,
            textAlign = TextAlign.Center,
            modifier = Modifier.widthIn(min = 52.dp).background(tone.background, RoundedCornerShape(10.dp)).padding(vertical = 6.dp),
        )
    }
}

@Composable
private fun CoeffField(grade: SimulatorRealGrade, onCoeffChange: (Double) -> Unit) {
    var text by remember { mutableStateOf(formatNote(grade.effectiveCoeff)) }
    // Follow outside changes (a shared coefficient becoming the community value) unless the text already matches
    LaunchedEffect(grade.effectiveCoeff) {
        if (parseDecimal(text) != grade.effectiveCoeff) text = formatNote(grade.effectiveCoeff)
    }
    val accent = if (grade.isCommunity) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        BasicTextField(
            value = text,
            onValueChange = { value ->
                text = value
                parseDecimal(value)?.let(onCoeffChange)
            },
            singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
            textStyle = MaterialTheme.typography.titleSmall.merge(NumberStyle).copy(
                color = if (grade.isCommunity && !grade.canShare) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface,
                textAlign = TextAlign.Center,
            ),
            cursorBrush = SolidColor(MaterialTheme.colorScheme.primary),
            modifier = Modifier
                .width(52.dp)
                .border(1.dp, accent.copy(alpha = 0.6f), RoundedCornerShape(8.dp))
                .padding(vertical = 6.dp)
                .semantics { contentDescription = "Coefficient" },
        )
        Text(
            if (grade.isCommunity) "commu." else "coeff.",
            style = MaterialTheme.typography.labelSmall.copy(fontSize = 9.sp),
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun SimulatedGradeRow(simulation: SimulatedGrade, onChange: (Double) -> Unit, onRemove: () -> Unit) {
    val tone = AppTheme.colors.grade(simulation.grade)
    val soft = MaterialTheme.colorScheme.primaryContainer
    Column(
        Modifier
            .fillMaxWidth()
            .padding(top = 10.dp)
            .background(Brush.horizontalGradient(listOf(soft, MaterialTheme.colorScheme.surface)))
            .padding(start = 16.dp, end = 8.dp, top = 8.dp, bottom = 4.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(
                "SIMULÉE",
                style = MaterialTheme.typography.labelSmall,
                fontWeight = FontWeight.ExtraBold,
                color = MaterialTheme.colorScheme.primary,
                modifier = Modifier.background(MaterialTheme.colorScheme.surface, CircleShape).padding(horizontal = 6.dp, vertical = 2.dp),
            )
            Text(simulation.name, style = MaterialTheme.typography.titleSmall, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f))
            Text("coeff. ${formatNote(simulation.coeff)}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            IconButton(onClick = onRemove) {
                Icon(Icons.Rounded.Delete, contentDescription = "Supprimer la simulation", tint = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Slider(
                value = simulation.grade.toFloat(),
                onValueChange = { onChange((it * 2).toInt() / 2.0) },
                valueRange = 0f..20f,
                steps = 39,
                modifier = Modifier.weight(1f).semantics { contentDescription = "Note simulée" },
            )
            Text(
                formatNote(simulation.grade),
                style = MaterialTheme.typography.titleMedium.merge(NumberStyle),
                color = tone.foreground,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(end = 8.dp).widthIn(min = 52.dp).background(tone.background, RoundedCornerShape(10.dp)).padding(vertical = 6.dp),
            )
        }
    }
}
