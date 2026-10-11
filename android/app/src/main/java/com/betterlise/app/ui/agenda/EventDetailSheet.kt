package com.betterlise.app.ui.agenda

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Groups
import androidx.compose.material.icons.rounded.Person
import androidx.compose.material.icons.rounded.Place
import androidx.compose.material.icons.rounded.Schedule
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.betterlise.app.data.api.CalendarEvent
import com.betterlise.app.data.api.EventKind
import com.betterlise.app.domain.PARIS
import com.betterlise.app.ui.components.SurfaceCard
import com.betterlise.app.ui.theme.AppTheme
import java.time.format.DateTimeFormatter
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EventDetailSheet(event: CalendarEvent, campusName: String, onDismiss: () -> Unit) {
    val tone = AppTheme.colors.event(event.kind)
    val isRu = event.kind == EventKind.Restaurant

    ModalBottomSheet(onDismissRequest = onDismiss, containerColor = MaterialTheme.colorScheme.background) {
        Column(
            Modifier
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp)
                .padding(bottom = 24.dp)
                .navigationBarsPadding(),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Text(
                event.kind.label.uppercase(),
                style = MaterialTheme.typography.labelSmall,
                fontWeight = FontWeight.Bold,
                color = tone.foreground,
                modifier = Modifier.background(tone.background, RoundedCornerShape(50)).padding(horizontal = 10.dp, vertical = 4.dp),
            )
            Text(if (isRu) "Menu RU · $campusName" else event.title, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)

            SurfaceCard {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    val day = event.startDate.atZone(PARIS).format(DateTimeFormatter.ofPattern("EEEE d MMMM", Locale.FRENCH))
                    DetailRow(Icons.Rounded.Schedule, "${day.replaceFirstChar(Char::titlecase)} · ${timeRange(event)}")
                    if (!isRu) {
                        event.room?.let { DetailRow(Icons.Rounded.Place, it) }
                        event.teacher?.let { DetailRow(Icons.Rounded.Person, it) }
                        event.group?.let { DetailRow(Icons.Rounded.Groups, it) }
                    }
                }
            }

            if (isRu) {
                event.summary.orEmpty().split("\n\n").filter { it.isNotBlank() }.forEach { block ->
                    val lines = block.split("\n", limit = 2)
                    SurfaceCard {
                        Text(lines.first(), style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.primary)
                        lines.getOrNull(1)?.let {
                            Text(
                                it.replace(", ", "\n"),
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.padding(top = 6.dp),
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun DetailRow(icon: ImageVector, text: String) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        Icon(icon, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(20.dp))
        Text(text, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}
