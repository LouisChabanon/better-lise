package com.betterlise.app.ui.grades.reveal

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.SoundPool
import com.betterlise.app.R

/** The web reveal sounds. Played only when the ringer is in normal mode (silent/vibrate stay quiet). */
class GradeRevealSound(context: Context) {
    private val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
    private val pool = SoundPool.Builder()
        .setMaxStreams(6)
        .setAudioAttributes(
            AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ASSISTANCE_SONIFICATION)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build(),
        )
        .build()

    private val open = pool.load(context, R.raw.reveal_start, 1)
    private val tick = pool.load(context, R.raw.reveal_tick, 1)
    private val reveal = pool.load(context, R.raw.item_reveal, 1)

    fun playOpen() = play(open, 0.3f)
    fun playTick() = play(tick, 0.2f)
    fun playReveal() = play(reveal, 0.3f)

    fun release() = pool.release()

    private fun play(sound: Int, volume: Float) {
        if (audioManager.ringerMode != AudioManager.RINGER_MODE_NORMAL) return
        pool.play(sound, volume, volume, 1, 0, 1f)
    }
}
