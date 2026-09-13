package com.betterlise.app.data.settings

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import com.betterlise.app.domain.LiseId
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

enum class Campus(val id: String, val displayName: String) {
    Chalons("Chalons", "Châlons"),
    Boquette("Boquette", "Aix-en-Provence (Boquette)"),
    Cluny("Cluny", "Cluny"),
    Birse("Birse", "Angers (Birse)"),
    P3("P3", "Paris (P3)"),
    Kin("KIN", "Lille (KIN)"),
    Bordels("Bordels", "Bordeaux (Bordels)"),
    Sibers("Sibers", "Metz (Sibers)"),
    Rabat("Rabat", "Rabat");

    companion object {
        fun fromId(id: String?) = entries.firstOrNull { it.id == id }
    }
}

enum class Promo(val id: String) {
    GIM1("GIM1"), GIM2("GIM2"), GIE1("GIE1"), GIE2("GIE2"), EXP("EXP"), Other("Autre");

    companion object {
        fun fromId(id: String?) = entries.firstOrNull { it.id == id }
    }
}

data class UserSettings(
    val liseId: String = "",
    val campus: Campus = Campus.Sibers,
    val promo: Promo? = null,
    val showRu: Boolean = true,
) {
    val hasValidLiseId: Boolean get() = LiseId.isValid(liseId)
}

/** Non-sensitive preferences persisted with DataStore. */
class SettingsRepository(private val dataStore: DataStore<Preferences>) {
    val settings: Flow<UserSettings> = dataStore.data.map { prefs ->
        UserSettings(
            liseId = prefs[LISE_ID].orEmpty(),
            campus = Campus.fromId(prefs[CAMPUS]) ?: Campus.Sibers,
            promo = Promo.fromId(prefs[PROMO]),
            showRu = prefs[SHOW_RU] ?: true,
        )
    }

    suspend fun setLiseId(value: String) = dataStore.edit { it[LISE_ID] = value.trim() }
    suspend fun setCampus(value: Campus) = dataStore.edit { it[CAMPUS] = value.id }
    suspend fun setShowRu(value: Boolean) = dataStore.edit { it[SHOW_RU] = value }
    suspend fun setPromo(value: Promo?) = dataStore.edit {
        if (value == null) it.remove(PROMO) else it[PROMO] = value.id
    }

    private companion object {
        val LISE_ID = stringPreferencesKey("lise_id")
        val CAMPUS = stringPreferencesKey("campus")
        val PROMO = stringPreferencesKey("promo")
        val SHOW_RU = booleanPreferencesKey("show_ru")
    }
}
