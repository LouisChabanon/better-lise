package com.betterlise.app.ui.achievements

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.betterlise.app.data.api.Achievement
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

private val UNLOCK_DATE = DateTimeFormatter.ofPattern("d MMMM yyyy", Locale.FRENCH)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun AchievementDetailSheet(achievement: Achievement, onDismiss: () -> Unit) {
    val palette = paletteFor(achievement)
    ModalBottomSheet(onDismissRequest = onDismiss, containerColor = MaterialTheme.colorScheme.surface) {
        Column(
            Modifier.fillMaxWidth().padding(horizontal = 24.dp).padding(bottom = 24.dp).navigationBarsPadding(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Box(
                Modifier.size(96.dp).background(palette.iconBackground, CircleShape).border(2.dp, palette.border, CircleShape),
                contentAlignment = Alignment.Center,
            ) {
                Icon(AchievementIcons.forBadge(achievement), contentDescription = null, tint = palette.accent, modifier = Modifier.size(44.dp))
            }
            Text(achievement.title, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.ExtraBold, textAlign = TextAlign.Center)
            Text(
                achievement.unlockedAt?.let { "Débloqué le ${UNLOCK_DATE.format(it.atZone(ZoneId.of("Europe/Paris")))}" } ?: "Pas encore débloqué",
                style = MaterialTheme.typography.labelLarge,
                color = if (achievement.isUnlocked) palette.accent else MaterialTheme.colorScheme.onSurfaceVariant,
            )
            val description = achievement.description ?: if (achievement.isHidden) "Certains succès sont cachés… cherche bien." else null
            description?.let {
                Text(it, style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center)
            }
            if (achievement.isUnlocked) {
                achievement.snark?.let {
                    Text(
                        "« $it »",
                        style = MaterialTheme.typography.bodyMedium,
                        fontStyle = FontStyle.Italic,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.fillMaxWidth().background(MaterialTheme.colorScheme.background, RoundedCornerShape(14.dp)).padding(12.dp),
                    )
                }
            }
        }
    }
}
