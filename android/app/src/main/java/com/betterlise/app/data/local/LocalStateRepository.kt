package com.betterlise.app.data.local

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.core.stringSetPreferencesKey
import com.betterlise.app.data.api.ApiClient
import com.betterlise.app.domain.SimulatorData
import kotlinx.coroutines.flow.first

/**
 * Per-account state that only lives on the device: simulator changes (the web keeps them in
 * localStorage) and the achievements already celebrated.
 */
class LocalStateRepository(private val dataStore: DataStore<Preferences>) {
    suspend fun simulator(username: String): SimulatorData {
        val raw = dataStore.data.first()[simulatorKey(username)] ?: return SimulatorData()
        return runCatching { ApiClient.json.decodeFromString(SimulatorData.serializer(), raw) }.getOrDefault(SimulatorData())
    }

    suspend fun saveSimulator(username: String, data: SimulatorData) {
        val raw = ApiClient.json.encodeToString(SimulatorData.serializer(), data)
        dataStore.edit { it[simulatorKey(username)] = raw }
    }

    /** null until the account's first achievements sync on this device. */
    suspend fun celebratedAchievements(username: String): Set<String>? = dataStore.data.first()[celebratedKey(username)]

    suspend fun saveCelebratedAchievements(username: String, codes: Set<String>) {
        dataStore.edit { it[celebratedKey(username)] = codes }
    }

    /** Forgets every account's local state (sign-out and account deletion). */
    suspend fun clearAll() {
        dataStore.edit { it.clear() }
    }

    private fun simulatorKey(username: String) = stringPreferencesKey("simulator_v1_$username")
    private fun celebratedKey(username: String) = stringSetPreferencesKey("achievements_celebrated_$username")
}
