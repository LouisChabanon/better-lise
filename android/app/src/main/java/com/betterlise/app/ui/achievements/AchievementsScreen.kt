package com.betterlise.app.ui.achievements

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.rounded.Star
import androidx.compose.material.icons.automirrored.rounded.StarHalf
import androidx.compose.material.icons.rounded.VisibilityOff
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.graphics.ColorMatrix
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.betterlise.app.data.api.Achievement
import com.betterlise.app.data.api.AchievementRarity
import com.betterlise.app.domain.AchievementSummary
import com.betterlise.app.ui.components.ErrorBanner
import com.betterlise.app.ui.components.errorMessage
import com.betterlise.app.ui.theme.AppTheme
import com.betterlise.app.ui.theme.NumberStyle
import com.betterlise.app.ui.theme.Tone

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AchievementsScreen(viewModel: AchievementsViewModel, onBack: () -> Unit) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    var selected by remember { mutableStateOf<Achievement?>(null) }

    LaunchedEffect(Unit) { viewModel.refresh() }

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        topBar = {
            TopAppBar(
                title = { Text("Succès") },
                navigationIcon = {
                    IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Rounded.ArrowBack, contentDescription = "Retour") }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.background),
            )
        },
    ) { padding ->
        val achievements = state.achievements.value
        LazyVerticalGrid(
            columns = GridCells.Fixed(2),
            modifier = Modifier.padding(padding).fillMaxSize().testTag("achievementsGrid"),
            contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 24.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            state.achievements.errorMessage?.let { message ->
                item(span = { GridItemSpan(maxLineSpan) }) { ErrorBanner(message, onRetry = viewModel::refresh) }
            }
            if (achievements.isNullOrEmpty()) {
                item(span = { GridItemSpan(maxLineSpan) }) {
                    Box(Modifier.fillMaxWidth().heightIn(min = 240.dp), contentAlignment = Alignment.Center) {
                        if (state.achievements.errorMessage == null) CircularProgressIndicator()
                    }
                }
            } else {
                item(span = { GridItemSpan(maxLineSpan) }) { SummaryCard(state.summary) }
                items(achievements, key = { it.code }) { achievement ->
                    AchievementBadge(achievement, onClick = { selected = achievement })
                }
            }
        }
    }

    selected?.let { AchievementDetailSheet(it, onDismiss = { selected = null }) }
}

@Composable
private fun SummaryCard(summary: AchievementSummary) {
    val progress = remember { Animatable(0f) }
    LaunchedEffect(summary.progress) {
        progress.animateTo(summary.progress.toFloat(), spring(dampingRatio = 0.8f, stiffness = 60f))
    }
    val primary = MaterialTheme.colorScheme.primary
    val track = MaterialTheme.colorScheme.surfaceVariant
    Row(
        Modifier.fillMaxWidth().background(MaterialTheme.colorScheme.surface, RoundedCornerShape(20.dp)).padding(16.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(18.dp),
    ) {
        Box(
            Modifier.size(96.dp).semantics(mergeDescendants = true) {
                contentDescription = "${summary.unlocked} succès débloqués sur ${summary.total}"
            },
            contentAlignment = Alignment.Center,
        ) {
            Canvas(Modifier.fillMaxSize()) {
                val stroke = 10.dp.toPx()
                val inset = stroke / 2
                val arcSize = androidx.compose.ui.geometry.Size(size.width - stroke, size.height - stroke)
                drawArc(track, 0f, 360f, false, Offset(inset, inset), arcSize, style = Stroke(stroke))
                drawArc(primary, -90f, 360f * progress.value, false, Offset(inset, inset), arcSize, style = Stroke(stroke, cap = StrokeCap.Round))
            }
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text("${(summary.progress * 100).toInt()} %", style = MaterialTheme.typography.titleLarge.merge(NumberStyle))
                Text("${summary.unlocked}/${summary.total}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text("Ta vitrine", style = MaterialTheme.typography.titleMedium)
            Stat(Icons.Rounded.Star, "Légendaires", "${summary.legendary}", AppTheme.colors.warning)
            Stat(Icons.AutoMirrored.Rounded.StarHalf, "Rares", "${summary.rare}", AppTheme.colors.success)
            Stat(Icons.Rounded.VisibilityOff, "Secrets", "${summary.secretsFound}/${summary.secrets}", Tone(MaterialTheme.colorScheme.background, MaterialTheme.colorScheme.onSurfaceVariant))
        }
    }
}

@Composable
private fun Stat(icon: androidx.compose.ui.graphics.vector.ImageVector, label: String, value: String, tone: Tone) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        Icon(icon, contentDescription = null, tint = tone.foreground, modifier = Modifier.size(16.dp))
        Text(label, style = MaterialTheme.typography.labelLarge, color = tone.foreground, modifier = Modifier.weight(1f))
        Text(
            value,
            style = MaterialTheme.typography.labelLarge.merge(NumberStyle),
            color = tone.foreground,
            modifier = Modifier.background(tone.background, CircleShape).padding(horizontal = 8.dp, vertical = 2.dp),
        )
    }
}

/** Rarity colors, reusing the grade badge palette like the web cards. */
internal data class AchievementPalette(val background: Color, val border: Color, val accent: Color, val iconBackground: Color)

@Composable
internal fun paletteFor(achievement: Achievement): AchievementPalette {
    val surface = MaterialTheme.colorScheme.surface
    val muted = MaterialTheme.colorScheme.onSurfaceVariant
    if (!achievement.isUnlocked) return AchievementPalette(surface, MaterialTheme.colorScheme.surfaceVariant, muted, MaterialTheme.colorScheme.background)
    return when (achievement.rarity) {
        AchievementRarity.Common -> AchievementPalette(surface, MaterialTheme.colorScheme.surfaceVariant, MaterialTheme.colorScheme.primary, MaterialTheme.colorScheme.primaryContainer)
        AchievementRarity.Rare -> AppTheme.colors.success.let { AchievementPalette(it.background, it.foreground.copy(alpha = 0.25f), it.foreground, surface.copy(alpha = 0.6f)) }
        AchievementRarity.Legendary -> AppTheme.colors.warning.let { AchievementPalette(it.background, it.foreground.copy(alpha = 0.35f), it.foreground, surface.copy(alpha = 0.6f)) }
    }
}

internal fun rarityLabel(achievement: Achievement): String = when {
    achievement.isHidden -> "SECRET"
    achievement.rarity == AchievementRarity.Common -> "COMMUN"
    achievement.rarity == AchievementRarity.Rare -> "RARE"
    else -> "LÉGENDAIRE"
}

private val Grayscale = ColorFilter.colorMatrix(ColorMatrix().apply { setToSaturation(0f) })

@Composable
private fun AchievementBadge(achievement: Achievement, onClick: () -> Unit) {
    val palette = paletteFor(achievement)
    val shape = RoundedCornerShape(22.dp)
    Column(
        Modifier
            .fillMaxWidth()
            .heightIn(min = 176.dp)
            .clip(shape)
            .background(palette.background)
            .border(1.dp, palette.border, shape)
            .then(if (achievement.isUnlocked && achievement.rarity == AchievementRarity.Legendary) Modifier.shimmer() else Modifier)
            .drawWithContent {
                drawContent()
                if (achievement.isUnlocked) drawRect(palette.accent, size = size.copy(height = 4.dp.toPx()))
            }
            .clickable(onClick = onClick)
            .padding(horizontal = 10.dp, vertical = 16.dp)
            .testTag("achievement-${achievement.code}")
            .semantics(mergeDescendants = true) {
                contentDescription = "${achievement.title}, ${if (achievement.isUnlocked) "débloqué" else "verrouillé"}"
            },
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Box(Modifier.size(60.dp).background(palette.iconBackground, CircleShape), contentAlignment = Alignment.Center) {
            Icon(
                AchievementIcons.forBadge(achievement),
                contentDescription = null,
                tint = palette.accent,
                modifier = Modifier.size(30.dp),
            )
        }
        Text(
            achievement.title,
            style = MaterialTheme.typography.titleSmall,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
            color = if (achievement.isUnlocked) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.onSurfaceVariant,
        )
        achievement.description?.let {
            Text(
                it,
                style = MaterialTheme.typography.bodySmall,
                textAlign = TextAlign.Center,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        Text(
            rarityLabel(achievement),
            style = MaterialTheme.typography.labelSmall.copy(fontSize = 9.sp, letterSpacing = 1.sp),
            fontWeight = FontWeight.ExtraBold,
            color = if (achievement.isUnlocked) palette.accent else MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

/** Light sweep across legendary badges. */
@Composable
private fun Modifier.shimmer(): Modifier {
    val phase by rememberInfiniteTransition(label = "shimmer").animateFloat(
        initialValue = -1f,
        targetValue = 2f,
        animationSpec = infiniteRepeatable(tween(2_400, delayMillis = 600, easing = LinearEasing), RepeatMode.Restart),
        label = "phase",
    )
    return drawWithContent {
        drawContent()
        val x = size.width * phase
        drawRect(
            Brush.linearGradient(
                listOf(Color.Transparent, Color.White.copy(alpha = 0.35f), Color.Transparent),
                start = Offset(x - size.width * 0.4f, 0f),
                end = Offset(x, size.height),
            ),
        )
    }
}
