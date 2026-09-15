package com.betterlise.app.ui.achievements

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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.betterlise.app.data.api.Achievement
import com.betterlise.app.ui.theme.AppTheme

/** Shown over the app when achievements unlock. */
@Composable
fun AchievementUnlockBanner(achievements: List<Achievement>, onOpen: () -> Unit, onDismiss: () -> Unit, modifier: Modifier = Modifier) {
    val haptics = LocalHapticFeedback.current
    LaunchedEffect(Unit) { haptics.performHapticFeedback(HapticFeedbackType.LongPress) }
    val shape = RoundedCornerShape(22.dp)
    Row(
        modifier
            .fillMaxWidth()
            .shadow(12.dp, shape)
            .background(MaterialTheme.colorScheme.surface, shape)
            .border(1.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.25f), shape)
            .clickable(onClick = onOpen)
            .padding(start = 12.dp, top = 12.dp, bottom = 12.dp, end = 4.dp)
            .testTag("achievementBanner"),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        val tone = AppTheme.colors.warning
        Box(Modifier.size(44.dp).background(tone.background, CircleShape), contentAlignment = Alignment.Center) {
            Icon(AchievementIcons.forKey(achievements.firstOrNull()?.icon), contentDescription = null, tint = tone.foreground)
        }
        Column(Modifier.weight(1f)) {
            Text(
                if (achievements.size > 1) "${achievements.size} succès débloqués !" else "Succès débloqué !",
                style = MaterialTheme.typography.labelMedium,
                fontWeight = FontWeight.ExtraBold,
                color = MaterialTheme.colorScheme.primary,
            )
            Text(
                achievements.joinToString(" · ") { it.title },
                style = MaterialTheme.typography.titleSmall,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
        }
        IconButton(onClick = onDismiss) {
            Icon(Icons.Rounded.Close, contentDescription = "Fermer", tint = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}
