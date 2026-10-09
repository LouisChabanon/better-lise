package com.betterlise.app.ui.grades.reveal

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.wrapContentHeight
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.runtime.withFrameMillis
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.graphics.BlendMode
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.CompositingStrategy
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.betterlise.app.ui.theme.NumberStyle
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.drop
import kotlinx.coroutines.flow.first
import java.util.Locale

private val DigitHeight = 56.dp
private const val WINDOW_RATIO = 1.6f
private val DigitSize = 44.sp

/**
 * Slot machine grade reveal (web components/slot-machine). One frame clock drives the four reels: each reel's
 * position is a pure function of the time since the start.
 */
@Composable
internal fun SlotMachine(
    grade: Double,
    animationsEnabled: Boolean,
    onTick: () -> Unit,
    onStopped: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val haptics = LocalHapticFeedback.current
    val reels = remember(grade, animationsEnabled) { SlotReveal.reels(grade, reducedMotion = !animationsEnabled) }
    var elapsedMs by remember(reels) { mutableLongStateOf(0L) }
    val stoppedCount by remember(reels) { derivedStateOf { SlotReveal.stoppedCount(reels, elapsedMs) } }
    val isRevealed = stoppedCount == SlotReveal.REEL_COUNT
    val latestOnTick by rememberUpdatedState(onTick)
    val latestOnStopped by rememberUpdatedState(onStopped)

    LaunchedEffect(reels) {
        val start = withFrameMillis { it }
        while (SlotReveal.stoppedCount(reels, elapsedMs) < SlotReveal.REEL_COUNT) {
            elapsedMs = withFrameMillis { it } - start
        }
    }
    LaunchedEffect(reels) {
        snapshotFlow { SlotReveal.tickKey(reels, elapsedMs) }
            .distinctUntilChanged()
            .drop(1)
            .collect {
                haptics.performHapticFeedback(HapticFeedbackType.SegmentFrequentTick)
                latestOnTick()
            }
    }
    LaunchedEffect(reels) {
        snapshotFlow { stoppedCount }.first { it == SlotReveal.REEL_COUNT }
        haptics.performHapticFeedback(HapticFeedbackType.Confirm)
        latestOnStopped()
    }

    // Landed digits stay neutral until the last reel stops, so the color does not give the range away
    val landedColor by animateColorAsState(
        if (isRevealed) Color(GradeRarity.of(grade).argb) else MaterialTheme.colorScheme.onSurface,
        tween(500),
        label = "landedColor",
    )
    val label = String.format(Locale.FRENCH, "%.2f", grade)

    Row(
        modifier
            .testTag("slotMachine")
            .clearAndSetSemantics {
                contentDescription = "Machine à sous"
                stateDescription = if (isRevealed) "Arrêtée sur $label" else "Défilement en cours"
            },
        horizontalArrangement = Arrangement.spacedBy(6.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        reels.forEach { reel ->
            SlotReelWindow(reel, elapsedMs, landedColor)
            if (reel.index == SlotReveal.DECIMAL_SEPARATOR_AFTER) {
                Text(",", fontSize = DigitSize, fontWeight = FontWeight.Black, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
        Text(
            "/20",
            fontSize = 20.sp,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(start = 2.dp),
        )
    }
}

@Composable
private fun SlotReelWindow(reel: SlotReel, elapsedMs: Long, landedColor: Color) {
    val shape = RoundedCornerShape(10.dp)
    val isStopped = reel.isStopped(elapsedMs)
    val position = reel.position(elapsedMs)
    val windowHeight = DigitHeight * WINDOW_RATIO
    val stripOffset = (windowHeight - DigitHeight) / 2
    // Only the digits around the window are drawn: the full strip is up to 90 digits long
    val first = (position.toInt() - 1).coerceAtLeast(0)
    val visible = first until minOf(first + 4, reel.stripSize)

    Box(
        Modifier
            .size(width = 52.dp, height = windowHeight)
            .clip(shape)
            .background(MaterialTheme.colorScheme.background)
            .border(2.dp, if (isStopped) landedColor else Color.Transparent, shape),
    ) {
        Column(
            Modifier
                .fillMaxWidth()
                .fadeEdges()
                .graphicsLayer { translationY = (stripOffset + DigitHeight * (first - position)).toPx() }
                .alpha(if (isStopped) 0.3f else 1f)
                .blur(if (isStopped) 0.dp else 1.2.dp),
        ) {
            visible.forEach { index ->
                Digit(
                    index % SlotReveal.DIGITS_PER_LOOP,
                    MaterialTheme.colorScheme.onSurface,
                    // The landed digit is drawn on top, in its own color
                    Modifier.alpha(if (isStopped && index == reel.target) 0f else 1f),
                )
            }
        }
        if (isStopped) {
            val pop = remember { Animatable(1.35f) }
            LaunchedEffect(Unit) { pop.animateTo(1f, spring(dampingRatio = 0.45f, stiffness = Spring.StiffnessMedium)) }
            Digit(
                reel.digit,
                landedColor,
                Modifier
                    .padding(top = stripOffset)
                    .graphicsLayer {
                        scaleX = pop.value
                        scaleY = pop.value
                        alpha = if (SlotReveal.isDimmed(reel)) 0.25f else 1f
                    },
            )
        }
        // Inner shadow at the top and bottom of the window
        Box(Modifier.fillMaxWidth().height(12.dp).background(Brush.verticalGradient(listOf(Color.Black.copy(alpha = 0.3f), Color.Transparent))))
        Box(
            Modifier.fillMaxWidth().height(12.dp).align(Alignment.BottomCenter)
                .background(Brush.verticalGradient(listOf(Color.Transparent, Color.Black.copy(alpha = 0.3f)))),
        )
    }
}

@Composable
private fun Digit(value: Int, color: Color, modifier: Modifier = Modifier) {
    Text(
        value.toString(),
        color = color,
        fontSize = DigitSize,
        style = NumberStyle.copy(fontWeight = FontWeight.Black),
        modifier = modifier.fillMaxWidth().height(DigitHeight).wrapContentHeight(),
        textAlign = TextAlign.Center,
    )
}

/** Fades the strip out at the top and bottom of the window. */
private fun Modifier.fadeEdges(): Modifier = this
    .graphicsLayer(compositingStrategy = CompositingStrategy.Offscreen)
    .drawWithContent {
        drawContent()
        drawRect(
            Brush.verticalGradient(
                0f to Color.Transparent,
                0.22f to Color.Black,
                0.78f to Color.Black,
                1f to Color.Transparent,
                startY = 0f,
                endY = (DigitHeight * WINDOW_RATIO).toPx(),
            ),
            blendMode = BlendMode.DstIn,
        )
    }
