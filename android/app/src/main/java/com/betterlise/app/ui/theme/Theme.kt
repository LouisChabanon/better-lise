package com.betterlise.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import com.betterlise.app.data.api.EventKind
import com.betterlise.app.domain.GradeSorting

// Palette ported from the web design tokens (styles/globals.css)
private val LightColors = lightColorScheme(
    primary = Color(0xFF6750A4),
    onPrimary = Color.White,
    primaryContainer = Color(0xFFF5F3FF),
    onPrimaryContainer = Color(0xFF4F378B),
    background = Color(0xFFF3F4F6),
    onBackground = Color(0xFF111827),
    surface = Color.White,
    onSurface = Color(0xFF111827),
    surfaceVariant = Color(0xFFE5E7EB),
    onSurfaceVariant = Color(0xFF6B7280),
    outline = Color(0xFFD1D5DB),
)

private val DarkColors = darkColorScheme(
    primary = Color(0xFFD0BCFF),
    onPrimary = Color(0xFF381E72),
    primaryContainer = Color(0xFF4F378B),
    onPrimaryContainer = Color(0xFFE8DEF8),
    background = Color(0xFF28252D),
    onBackground = Color.White,
    surface = Color(0xFF1E1B22),
    onSurface = Color.White,
    surfaceVariant = Color(0xFF333038),
    onSurfaceVariant = Color(0xFFC4C7C5),
    outline = Color(0xFF49454F),
)

@Immutable
data class Tone(val background: Color, val foreground: Color)

@Immutable
data class BetterLiseColors(
    val success: Tone,
    val warning: Tone,
    val danger: Tone,
    val lecture: Tone,
    val exam: Tone,
    val selfStudy: Tone,
    val practical: Tone,
    val restaurant: Tone,
    val other: Tone,
) {
    fun event(kind: EventKind): Tone = when (kind) {
        EventKind.Lecture -> lecture
        EventKind.Exam -> exam
        EventKind.SelfStudy, EventKind.Project -> selfStudy
        EventKind.Practical -> practical
        EventKind.Restaurant -> restaurant
        EventKind.Tutorial, EventKind.Other -> other
    }

    fun grade(note: Double): Tone = when (GradeSorting.tier(note)) {
        GradeSorting.Tier.Failing -> danger
        GradeSorting.Tier.Passing -> warning
        GradeSorting.Tier.Good -> success
    }

    fun absence(percentage: Double): Tone = when {
        percentage >= 20 -> danger
        percentage >= 10 -> warning
        else -> success
    }
}

private val LightExtra = BetterLiseColors(
    success = Tone(Color(0xFFDCFCE7), Color(0xFF14532D)),
    warning = Tone(Color(0xFFFEF9C3), Color(0xFFA16207)),
    danger = Tone(Color(0xFFFEE2E2), Color(0xFF991B1B)),
    lecture = Tone(Color(0xFFFDE68A), Color(0xFF854D0E)),
    exam = Tone(Color(0xFFFCA5A5), Color(0xFF991B1B)),
    selfStudy = Tone(Color(0xFFCBD5E1), Color(0xFF1E293B)),
    practical = Tone(Color(0xFF93C5FD), Color(0xFF1E40AF)),
    restaurant = Tone(Color(0xFFCFE8F5), Color(0xFF0B5E8E)),
    other = Tone(Color(0xFFC4B5FD), Color(0xFF5B21B6)),
)

private val DarkExtra = BetterLiseColors(
    success = Tone(Color(0xFF064E3B), Color(0xFF6EE7B7)),
    warning = Tone(Color(0xFF78350F), Color(0xFFFCD34D)),
    danger = Tone(Color(0xFF7F1D1D), Color(0xFFFCA5A5)),
    lecture = Tone(Color(0xFFB27C0E), Color.White),
    exam = Tone(Color(0xFF9E2A2B), Color.White),
    selfStudy = Tone(Color(0xFF3D405B), Color(0xFFE0E1DD)),
    practical = Tone(Color(0xFF1D4E89), Color.White),
    restaurant = Tone(Color(0xFF4A4E69), Color(0xFFF2E9E4)),
    other = Tone(Color(0xFF453375), Color.White),
)

val LocalBetterLiseColors = staticCompositionLocalOf { LightExtra }

private val AppTypography = Typography().run {
    copy(
        headlineMedium = headlineMedium.copy(fontWeight = FontWeight.Bold, letterSpacing = (-0.5).sp),
        titleLarge = titleLarge.copy(fontWeight = FontWeight.Bold),
        titleMedium = titleMedium.copy(fontWeight = FontWeight.SemiBold),
    )
}

val NumberStyle = TextStyle(fontWeight = FontWeight.ExtraBold, fontFeatureSettings = "tnum")

@Composable
fun BetterLiseTheme(darkTheme: Boolean = isSystemInDarkTheme(), content: @Composable () -> Unit) {
    androidx.compose.runtime.CompositionLocalProvider(
        LocalBetterLiseColors provides if (darkTheme) DarkExtra else LightExtra,
    ) {
        MaterialTheme(
            colorScheme = if (darkTheme) DarkColors else LightColors,
            typography = AppTypography,
            content = content,
        )
    }
}

object AppTheme {
    val colors: BetterLiseColors
        @Composable get() = LocalBetterLiseColors.current
}

