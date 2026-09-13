package com.betterlise.app.data.cache

import com.betterlise.app.data.api.ApiClient
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.KSerializer
import java.io.File

/** Stores the last successful API responses so screens render instantly on launch. */
class ResponseCache(baseDir: File) {
    private val directory = File(baseDir, "responses").apply { mkdirs() }

    suspend fun <T> load(key: String, serializer: KSerializer<T>): T? = withContext(Dispatchers.IO) {
        val file = fileFor(key)
        if (!file.exists()) return@withContext null
        runCatching { ApiClient.json.decodeFromString(serializer, file.readText()) }.getOrNull()
    }

    suspend fun <T> save(key: String, serializer: KSerializer<T>, value: T) = withContext(Dispatchers.IO) {
        runCatching {
            val file = fileFor(key)
            val tmp = File(directory, "${file.name}.tmp")
            tmp.writeText(ApiClient.json.encodeToString(serializer, value))
            tmp.renameTo(file)
        }
        Unit
    }

    suspend fun clear() = withContext(Dispatchers.IO) {
        directory.listFiles()?.forEach { it.delete() }
        Unit
    }

    private fun fileFor(key: String) = File(directory, key.replace(Regex("[^A-Za-z0-9_-]"), "_") + ".json")
}
