package com.betterlise.app

import android.content.Context
import androidx.datastore.preferences.preferencesDataStore
import com.betterlise.app.data.api.ApiClient
import com.betterlise.app.data.auth.KeystoreSecureStore
import com.betterlise.app.data.auth.SessionRepository
import com.betterlise.app.data.cache.ResponseCache
import com.betterlise.app.data.settings.SettingsRepository

private val Context.settingsDataStore by preferencesDataStore(name = "settings")

/** Composition root: builds the shared singletons once per process. */
class AppContainer(context: Context) {
    private val apiClient = ApiClient(BuildConfig.API_BASE_URL)
    val session = SessionRepository(apiClient, KeystoreSecureStore(context))
    val settings = SettingsRepository(context.settingsDataStore)
    val cache = ResponseCache(context.cacheDir)
}
