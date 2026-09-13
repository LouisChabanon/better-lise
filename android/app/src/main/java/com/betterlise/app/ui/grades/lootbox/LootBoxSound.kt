package com.betterlise.app.ui.grades.lootbox

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.SoundPool
import com.betterlise.app.R

/** The web lootbox sounds. Played only when the ringer is in normal mode (silent/vibrate stay quiet). */
class LootBoxSound(context: Context) {
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

    private val open = pool.load(context, R.raw.crate_open, 1)
    private val tick = pool.load(context, R.raw.crate_item_scroll, 1)
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
