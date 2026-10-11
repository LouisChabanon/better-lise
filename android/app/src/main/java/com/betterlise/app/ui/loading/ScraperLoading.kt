package com.betterlise.app.ui.loading

import android.provider.Settings
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.CheckCircle
import androidx.compose.material.icons.rounded.Language
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.withFrameMillis
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.betterlise.app.ui.theme.NumberStyle

/** Estimated progress, recomputed every frame while the sync runs. */
@Composable
private fun rememberScraperProgress(startedAtMs: Long, expectedSeconds: Double, isFinished: Boolean): Double {
    var now by remember { mutableLongStateOf(System.currentTimeMillis()) }
    LaunchedEffect(startedAtMs, isFinished) {
        while (!isFinished) {
            withFrameMillis { now = System.currentTimeMillis() }
        }
    }
    if (isFinished) return 100.0
    return ScraperProgress(expectedSeconds).progress((now - startedAtMs) / 1000.0)
}

@Composable
private fun animationsEnabled(): Boolean {
    val resolver = LocalContext.current.contentResolver
    return remember { Settings.Global.getFloat(resolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f) != 0f }
}

/**
 * Native port of the web app's Lise loading animation (components/ui/LoadingBar.tsx): an abstract Lise
 * page scanned by a laser while rows get "extracted", with a percentage and the current phase.
 */
@Composable
fun ScraperLoadingView(
    startedAtMs: Long,
    expectedSeconds: Double,
    isFinished: Boolean,
    slowNotice: String?,
    modifier: Modifier = Modifier,
) {
    val progress = rememberScraperProgress(startedAtMs, expectedSeconds, isFinished)
    val message = if (isFinished) "Terminé" else ScraperProgress.message(progress)
    val animated = animationsEnabled()

    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(32.dp)
            .semantics(mergeDescendants = true) {
                contentDescription = if (isFinished) "Synchronisation terminée" else "Synchronisation avec Lise"
                stateDescription = if (isFinished) "" else "${progress.toInt()} %, $message"
            },
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        ScannedPage(progress, animated)
        Spacer(Modifier.height(24.dp))
        Row(verticalAlignment = Alignment.Bottom) {
            Text(
                "${progress.toInt()}",
                style = MaterialTheme.typography.displaySmall.merge(NumberStyle),
                color = MaterialTheme.colorScheme.onBackground,
            )
            Text(
                " %",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(bottom = 6.dp),
            )
        }
        AnimatedContent(
            targetState = message,
            transitionSpec = { (slideInVertically { it / 2 } + fadeIn()) togetherWith (slideOutVertically { -it / 2 } + fadeOut()) },
            label = "phase",
        ) { phase ->
            if (isFinished) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Rounded.CheckCircle, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(20.dp))
                    Text(" $phase", color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.SemiBold)
                }
            } else {
                Text(phase, style = MaterialTheme.typography.titleSmall, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.8f))
            }
        }
        Spacer(Modifier.height(20.dp))
        Text(
            text = if (isFinished || progress >= 90) " " else slowNotice ?: "Lise peut mettre quelques secondes à répondre.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center,
        )
    }
}

private data class SkeletonRow(val threshold: Double, val titleWidth: Float, val subtitleWidth: Float)

private val SKELETON_ROWS = listOf(
    SkeletonRow(0.15, 1f, 0.4f),
    SkeletonRow(0.35, 0.85f, 0.6f),
    SkeletonRow(0.55, 0.95f, 0.3f),
    SkeletonRow(0.75, 0.8f, 0.5f),
)

@Composable
private fun ScannedPage(progress: Double, animated: Boolean) {
    val colors = MaterialTheme.colorScheme
    val scan = ScraperProgress.scanFraction(progress)
    val shape = RoundedCornerShape(16.dp)

    Column(
        Modifier
            .size(width = 288.dp, height = 192.dp)
            .shadow(16.dp, shape, ambientColor = Color.Black.copy(alpha = 0.1f), spotColor = Color.Black.copy(alpha = 0.1f))
            .clip(shape)
            .background(colors.surface)
            .border(1.dp, colors.outline.copy(alpha = 0.5f), shape),
    ) {
        Row(
            Modifier.fillMaxWidth().height(28.dp).background(colors.background).padding(horizontal = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            repeat(3) { Box(Modifier.size(10.dp).background(colors.onSurfaceVariant.copy(alpha = 0.2f), CircleShape)) }
            Spacer(Modifier.weight(1f))
            Box(Modifier.size(width = 96.dp, height = 8.dp).background(colors.onSurfaceVariant.copy(alpha = 0.1f), CircleShape))
        }

        BoxWithConstraints(Modifier.fillMaxSize()) {
            Column(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.SpaceBetween) {
                SKELETON_ROWS.forEach { row -> SkeletonLine(row, isExtracted = scan > row.threshold, animated = animated) }
            }

            val laserAlpha by animateFloatAsState(if (progress < 15 || progress > 98) 0f else 1f, tween(300), label = "laser")
            Laser(
                animated = animated,
                modifier = Modifier
                    .offset(y = maxHeight * scan.toFloat() - 24.dp)
                    .alpha(laserAlpha),
            )

            val overlayAlpha by animateFloatAsState(if (progress < 15) 1f else 0f, tween(500), label = "overlay")
            if (overlayAlpha > 0f) ConnectingOverlay(animated, Modifier.alpha(overlayAlpha))
        }
    }
}

@Composable
private fun SkeletonLine(row: SkeletonRow, isExtracted: Boolean, animated: Boolean) {
    val colors = MaterialTheme.colorScheme
    val title by animateColorAsState(if (isExtracted) colors.onSurface else colors.background, tween(300), label = "title")
    val subtitle by animateColorAsState(if (isExtracted) colors.onSurfaceVariant else colors.background.copy(alpha = 0.6f), tween(300), label = "subtitle")
    val badgeScale by animateFloatAsState(
        if (isExtracted) 1f else 0.75f,
        if (animated) spring(dampingRatio = 0.55f) else tween(0),
        label = "badge",
    )

    Row(verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Box(Modifier.fillMaxWidth(0.75f * row.titleWidth).height(10.dp).background(title, CircleShape))
            Box(Modifier.fillMaxWidth(0.75f * row.subtitleWidth).height(6.dp).background(subtitle, CircleShape))
        }
        Box(
            Modifier
                .size(width = 32.dp, height = 20.dp)
                .scale(badgeScale)
                .alpha(if (isExtracted) 1f else 0.5f)
                .background(if (isExtracted) colors.primary.copy(alpha = 0.12f) else colors.background, RoundedCornerShape(5.dp))
                .border(1.dp, colors.primary.copy(alpha = if (isExtracted) 0.35f else 0f), RoundedCornerShape(5.dp)),
            contentAlignment = Alignment.Center,
        ) {
            if (isExtracted) Box(Modifier.size(width = 12.dp, height = 4.dp).background(colors.primary, CircleShape))
        }
    }
}

@Composable
private fun Laser(animated: Boolean, modifier: Modifier) {
    val primary = MaterialTheme.colorScheme.primary
    val pulse = if (animated) {
        rememberInfiniteTransition(label = "pulse")
            .animateFloat(1f, 0.3f, infiniteRepeatable(tween(600), RepeatMode.Reverse), label = "dot").value
    } else {
        1f
    }
    Box(
        modifier
            .fillMaxWidth()
            .height(48.dp)
            .background(Brush.verticalGradient(listOf(Color.Transparent, primary.copy(alpha = 0.12f), Color.Transparent))),
        contentAlignment = Alignment.CenterEnd,
    ) {
        Box(Modifier.fillMaxWidth().height(1.dp).shadow(4.dp, spotColor = primary).background(primary))
        Box(Modifier.padding(end = 8.dp).size(6.dp).alpha(pulse).background(primary, CircleShape))
    }
}

@Composable
private fun ConnectingOverlay(animated: Boolean, modifier: Modifier) {
    val pulse = if (animated) {
        rememberInfiniteTransition(label = "connect")
            .animateFloat(1f, 0.4f, infiniteRepeatable(tween(700), RepeatMode.Reverse), label = "icon").value
    } else {
        1f
    }
    Column(
        modifier.fillMaxSize().background(MaterialTheme.colorScheme.surface.copy(alpha = 0.92f)),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Icon(Icons.Rounded.Language, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(28.dp).alpha(pulse))
        Text(
            "AUTH. LISE…",
            fontFamily = FontFamily.Monospace,
            fontSize = 10.sp,
            letterSpacing = 2.sp,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(top = 8.dp),
        )
    }
}

/** Compact variant floating above cached content while Lise syncs in the background. */
@Composable
fun SyncProgressPill(startedAtMs: Long, expectedSeconds: Double, isFinished: Boolean, modifier: Modifier = Modifier) {
    val progress = rememberScraperProgress(startedAtMs, expectedSeconds, isFinished)
    Surface(
        modifier = modifier.semantics(mergeDescendants = true) {},
        shape = CircleShape,
        color = MaterialTheme.colorScheme.surface,
        tonalElevation = 3.dp,
        shadowElevation = 6.dp,
    ) {
        Row(
            Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            if (isFinished) {
                Icon(Icons.Rounded.CheckCircle, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(18.dp))
                Text("À jour", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurface)
            } else {
                CircularProgressIndicator(
                    progress = { (progress / 100).toFloat() },
                    modifier = Modifier.size(16.dp),
                    strokeWidth = 2.5.dp,
                    trackColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.2f),
                )
                Text(ScraperProgress.message(progress), style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurface)
                Text(
                    "${progress.toInt()} %",
                    style = MaterialTheme.typography.labelLarge.merge(NumberStyle),
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.width(40.dp),
                    textAlign = TextAlign.End,
                )
            }
        }
    }
}

/**
 * Shows the full loading animation while nothing is cached, otherwise the content with a progress pill
 * floating at the bottom until the sync completes.
 */
@Composable
fun SyncAwareContent(
    sync: SyncState,
    expectedSeconds: Double,
    slowNotice: String?,
    content: @Composable () -> Unit,
) {
    // Keep the last active sync so exit animations still have something to draw once it turns Idle
    var lastActive by remember { mutableStateOf<SyncState>(SyncState.Idle) }
    if (sync != SyncState.Idle) lastActive = sync

    AnimatedContent(
        targetState = sync.showsFullLoader,
        transitionSpec = { fadeIn(tween(400)) togetherWith fadeOut(tween(300)) },
        label = "loader",
    ) { showsFullLoader ->
        val active = lastActive
        val startedAt = active.startTimeMs
        if (showsFullLoader && startedAt != null) {
            ScraperLoadingView(
                startedAtMs = startedAt,
                expectedSeconds = expectedSeconds,
                isFinished = active is SyncState.Finished,
                slowNotice = slowNotice,
            )
        } else {
            Box(Modifier.fillMaxSize()) {
                content()
                AnimatedVisibility(
                    visible = sync.showsCompactLoader,
                    modifier = Modifier.align(Alignment.BottomCenter).padding(bottom = 16.dp),
                    enter = slideInVertically { it } + fadeIn(),
                    exit = slideOutVertically { it } + fadeOut(),
                ) {
                    if (startedAt != null) {
                        SyncProgressPill(startedAt, expectedSeconds, isFinished = active is SyncState.Finished)
                    }
                }
            }
        }
    }
}
