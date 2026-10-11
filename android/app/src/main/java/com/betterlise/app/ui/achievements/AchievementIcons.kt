package com.betterlise.app.ui.achievements

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.TrendingDown
import androidx.compose.material.icons.rounded.AutoAwesome
import androidx.compose.material.icons.rounded.EmojiEvents
import androidx.compose.material.icons.rounded.Favorite
import androidx.compose.material.icons.rounded.Flag
import androidx.compose.material.icons.rounded.GpsFixed
import androidx.compose.material.icons.rounded.LocalFireDepartment
import androidx.compose.material.icons.rounded.Lock
import androidx.compose.material.icons.rounded.QuestionMark
import androidx.compose.material.icons.rounded.Replay
import androidx.compose.material.icons.rounded.Science
import androidx.compose.material.icons.rounded.Star
import androidx.compose.ui.graphics.vector.ImageVector
import com.betterlise.app.data.api.Achievement

/** Material icon for the icon keys sent by the API. */
object AchievementIcons {
    fun forKey(icon: String?): ImageVector = when (icon) {
        "rocket" -> Icons.Rounded.AutoAwesome
        "trophy" -> Icons.Rounded.EmojiEvents
        "fall" -> Icons.AutoMirrored.Rounded.TrendingDown
        "reload" -> Icons.Rounded.Replay
        "fire" -> Icons.Rounded.LocalFireDepartment
        "aim" -> Icons.Rounded.GpsFixed
        "heart" -> Icons.Rounded.Favorite
        "experiment" -> Icons.Rounded.Science
        "flag" -> Icons.Rounded.Flag
        else -> Icons.Rounded.Star
    }

    fun forBadge(achievement: Achievement): ImageVector = when {
        achievement.isHidden -> Icons.Rounded.QuestionMark
        !achievement.isUnlocked -> Icons.Rounded.Lock
        else -> forKey(achievement.icon)
    }
}
