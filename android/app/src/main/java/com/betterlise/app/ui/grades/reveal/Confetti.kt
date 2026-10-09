package com.betterlise.app.ui.grades.reveal

import androidx.compose.foundation.Canvas
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.withFrameMillis
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.rotate
import kotlin.math.cos
import kotlin.math.sin
import kotlin.random.Random

private data class Particle(
    val originX: Float,
    val angle: Float,
    val speed: Float,
    val spin: Float,
    val color: Color,
    val delayMs: Long,
)

private val PALETTE = listOf(0xFFFFB900, 0xFFA800B7, 0xFF155DFC, 0xFF22C55E, 0xFFF43F5E, 0xFF6750A4).map { Color(it) }

/** Confetti bursts from the left and right thirds for 3 s, like the web `canvas-confetti` effect. */
@Composable
fun Confetti(modifier: Modifier = Modifier, durationMs: Long = 3_000) {
    val particles = remember {
        List(160) { index ->
            Particle(
                originX = if (index % 2 == 0) Random.nextFloat() * 0.2f + 0.1f else Random.nextFloat() * 0.2f + 0.7f,
                angle = Random.nextFloat() * 2 * Math.PI.toFloat(),
                speed = Random.nextFloat() * 700f + 350f,
                spin = Random.nextFloat() * 720f - 360f,
                color = PALETTE[index % PALETTE.size],
                delayMs = (Random.nextFloat() * durationMs * 0.6f).toLong(),
            )
        }
    }
    var elapsed by remember { mutableLongStateOf(0L) }
    LaunchedEffect(Unit) {
        val start = withFrameMillis { it }
        while (elapsed < durationMs + 1_500) {
            withFrameMillis { elapsed = it - start }
        }
    }

    Canvas(modifier) {
        particles.forEach { particle ->
            val t = (elapsed - particle.delayMs) / 1000f
            if (t < 0 || t > 1.5f) return@forEach
            val x = size.width * particle.originX + cos(particle.angle) * particle.speed * t
            val y = size.height * 0.25f + sin(particle.angle) * particle.speed * t + 900f * t * t
            val alpha = (1f - t / 1.5f).coerceIn(0f, 1f)
            rotate(particle.spin * t, pivot = Offset(x, y)) {
                drawRect(particle.color.copy(alpha = alpha), topLeft = Offset(x - 15f, y - 9f), size = Size(30f, 18f))
            }
        }
    }
}
