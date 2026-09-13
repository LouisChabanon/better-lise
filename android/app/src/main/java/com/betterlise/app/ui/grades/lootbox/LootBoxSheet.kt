package com.betterlise.app.ui.grades.lootbox

import android.provider.Settings
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.requiredWidth
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.wrapContentWidth
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.SheetValue
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.zIndex
import com.betterlise.app.data.api.Grade
import com.betterlise.app.ui.theme.NumberStyle
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.drop
import java.util.Locale
import kotlin.random.Random

private enum class Phase { Ready, Rolling, Revealed }

/** Native port of the web casino reveal (components/ui/GradeLootBoxModal.tsx + LootCase.tsx). */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LootBoxSheet(
    grade: Grade,
    /** The reel stopped on the grade: mark it as opened. */
    onRevealed: () -> Unit,
    /** The reveal was shown long enough: move on to the grade detail. */
    onComplete: () -> Unit,
    /** Closed before opening the case. */
    onDismiss: () -> Unit,
) {
    var phase by remember { mutableStateOf(Phase.Ready) }
    val sheetState = rememberModalBottomSheetState(
        skipPartiallyExpanded = true,
        confirmValueChange = { it != SheetValue.Hidden || phase != Phase.Rolling },
    )
    val context = LocalContext.current
    val sound = remember { LootBoxSound(context) }
    DisposableEffect(Unit) { onDispose { sound.release() } }
    val animationsEnabled = remember {
        Settings.Global.getFloat(context.contentResolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f) != 0f
    }
    val reel = remember(grade.code) { LootBox.makeReel(winning = grade.note) }
    val rarity = LootRarity.of(grade.note)
    val rarityColor = Color(rarity.argb)

    ModalBottomSheet(
        onDismissRequest = { if (phase != Phase.Rolling) onDismiss() },
        sheetState = sheetState,
        containerColor = MaterialTheme.colorScheme.surface,
    ) {
        Box {
            Column(
                Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 24.dp)
                    .padding(bottom = 24.dp)
                    .navigationBarsPadding(),
                verticalArrangement = Arrangement.spacedBy(20.dp),
            ) {
                Column {
                    Text("Révéler · ${grade.libelle}", style = MaterialTheme.typography.titleLarge, maxLines = 2)
                    Text(grade.code, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }

                Reel(
                    reel = reel,
                    phase = phase,
                    rarityColor = rarityColor,
                    animationsEnabled = animationsEnabled,
                    onTick = { sound.playTick() },
                    onStopped = {
                        sound.playReveal()
                        phase = Phase.Revealed
                        onRevealed()
                    },
                )

                AnimatedContent(
                    targetState = phase,
                    transitionSpec = { (fadeIn() + scaleIn(initialScale = 0.8f)) togetherWith fadeOut() },
                    label = "footer",
                    modifier = Modifier.fillMaxWidth(),
                ) { current ->
                    when (current) {
                        Phase.Ready -> Button(
                            onClick = {
                                sound.playOpen()
                                phase = Phase.Rolling
                            },
                            shape = RoundedCornerShape(16.dp),
                            modifier = Modifier.fillMaxWidth().height(52.dp),
                        ) { Text("Voir la note", fontWeight = FontWeight.SemiBold) }
                        Phase.Rolling -> Text(
                            "Ouverture de la caisse…",
                            style = MaterialTheme.typography.titleSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.fillMaxWidth().wrapContentWidth(),
                        )
                        Phase.Revealed -> Text(
                            rarity.label.uppercase(),
                            color = Color.White,
                            fontWeight = FontWeight.Black,
                            letterSpacing = 3.sp,
                            modifier = Modifier
                                .fillMaxWidth()
                                .wrapContentWidth()
                                .background(rarityColor, CircleShape)
                                .padding(horizontal = 16.dp, vertical = 8.dp),
                        )
                    }
                }
            }

            if (phase == Phase.Revealed && LootBox.shouldCelebrate(grade.note) && animationsEnabled) {
                Confetti(Modifier.matchParentSize())
            }
        }
    }

    val latestOnComplete by rememberUpdatedState(onComplete)
    LaunchedEffect(phase) {
        if (phase == Phase.Revealed) {
            delay(LootBox.REVEAL_HOLD_MS)
            latestOnComplete()
        }
    }
}

@Composable
private fun Reel(
    reel: List<LootItem>,
    phase: Phase,
    rarityColor: Color,
    animationsEnabled: Boolean,
    onTick: () -> Unit,
    onStopped: () -> Unit,
) {
    val haptics = LocalHapticFeedback.current
    val shape = RoundedCornerShape(16.dp)
    val glow = if (phase == Phase.Revealed && animationsEnabled) {
        rememberInfiniteTransition(label = "neon").animateFloat(10f, 30f, infiniteRepeatable(tween(500), RepeatMode.Reverse), label = "glow").value
    } else if (phase == Phase.Revealed) {
        16f
    } else {
        0f
    }

    BoxWithConstraints(
        Modifier
            .fillMaxWidth()
            .height(140.dp)
            .shadow(glow.dp, shape, ambientColor = rarityColor, spotColor = rarityColor)
            .clip(shape)
            .background(MaterialTheme.colorScheme.background)
            .border(4.dp, MaterialTheme.colorScheme.surfaceVariant, shape),
    ) {
        val containerWidth = maxWidth.value
        val offset = remember { Animatable(0f) }
        val latestOnTick by rememberUpdatedState(onTick)
        val latestOnStopped by rememberUpdatedState(onStopped)

        LaunchedEffect(phase == Phase.Ready) {
            if (phase != Phase.Rolling) return@LaunchedEffect
            val stop = LootBox.stopOffset(containerWidth = containerWidth, jitterUnit = Random.nextDouble())
            offset.animateTo(stop, tween(LootBox.ROLL_DURATION_MS, easing = LootBox.Easing))
            haptics.performHapticFeedback(HapticFeedbackType.Confirm)
            latestOnStopped()
        }
        LaunchedEffect(Unit) {
            snapshotFlow { LootBox.centeredIndex(offset.value, containerWidth) }
                .distinctUntilChanged()
                .drop(1)
                .collect {
                    haptics.performHapticFeedback(HapticFeedbackType.SegmentFrequentTick)
                    latestOnTick()
                }
        }

        if (phase == Phase.Ready) {
            ReadyCase(animationsEnabled)
        } else {
            // The row is ~50 items wide: anchor it at the start and let it overflow to the right
            val rowWidth = (LootBox.ITEM_WIDTH * reel.size).dp
            val containerWidthDp = maxWidth
            Row(
                Modifier
                    .requiredWidth(rowWidth)
                    .fillMaxHeight()
                    // Lambda offset: the reel moves every frame without recomposing
                    .offset { IntOffset((offset.value.dp + (rowWidth - containerWidthDp) / 2).roundToPx(), 0) },
            ) {
                reel.forEach { item ->
                    ReelItem(item, isWinner = phase == Phase.Revealed && item.id == LootBox.WINNING_INDEX, width = LootBox.ITEM_WIDTH.dp)
                }
            }
            ReelChrome()
        }
    }
}

@Composable
private fun ReadyCase(animationsEnabled: Boolean) {
    val pulse = if (animationsEnabled) {
        rememberInfiniteTransition(label = "gift").animateFloat(1f, 0.75f, infiniteRepeatable(tween(900), RepeatMode.Reverse), label = "pulse").value
    } else {
        1f
    }
    Column(Modifier.fillMaxSize(), verticalArrangement = Arrangement.Center, horizontalAlignment = Alignment.CenterHorizontally) {
        Text("🎁", fontSize = 52.sp, modifier = Modifier.alpha(pulse).scale(0.95f + 0.05f * pulse))
        Text(
            "Prêt à révéler ?",
            style = MaterialTheme.typography.titleSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(top = 8.dp),
        )
    }
}

@Composable
private fun ReelItem(item: LootItem, isWinner: Boolean, width: Dp) {
    val color = Color(item.rarity.argb)
    val pop by animateFloatAsState(if (isWinner) 1.06f else 1f, spring(dampingRatio = 0.4f), label = "pop")
    Box(
        Modifier
            .width(width)
            .fillMaxHeight()
            .zIndex(if (isWinner) 1f else 0f)
            .scale(pop)
            .shadow(if (isWinner) 16.dp else 0.dp, ambientColor = color, spotColor = color)
            .background(color)
            .border(3.dp, if (isWinner) Color.White.copy(alpha = 0.8f) else Color.Black.copy(alpha = 0.25f)),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            String.format(Locale.FRENCH, "%.2f", item.grade),
            color = Color.White,
            fontSize = 26.sp,
            style = NumberStyle,
        )
        Box(Modifier.align(Alignment.CenterEnd).width(2.dp).fillMaxHeight().background(MaterialTheme.colorScheme.background))
    }
}

/** Center marker and edge fades above the reel. */
@Composable
private fun ReelChrome() {
    val background = MaterialTheme.colorScheme.background
    Box(Modifier.fillMaxSize()) {
        Box(
            Modifier.fillMaxHeight().fillMaxWidth(0.25f).align(Alignment.CenterStart)
                .background(Brush.horizontalGradient(listOf(background, Color.Transparent))),
        )
        Box(
            Modifier.fillMaxHeight().fillMaxWidth(0.25f).align(Alignment.CenterEnd)
                .background(Brush.horizontalGradient(listOf(Color.Transparent, background))),
        )
        Box(Modifier.width(2.dp).fillMaxHeight().align(Alignment.Center).background(MaterialTheme.colorScheme.surface))
    }
}
