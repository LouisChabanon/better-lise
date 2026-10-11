package com.betterlise.app.data.api

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.SerializationException
import kotlinx.serialization.json.Json
import okhttp3.HttpUrl
import okhttp3.HttpUrl.Companion.toHttpUrl
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.IOException
import java.util.concurrent.TimeUnit

/** Low-level HTTP client for the Better Lise `/api/v1` API. */
class ApiClient(
    baseUrl: String,
    private val http: OkHttpClient = defaultHttpClient(),
) {
    private val apiRoot: HttpUrl = baseUrl.trimEnd('/').toHttpUrl().newBuilder().addPathSegments("api/v1").build()

    suspend fun <T> send(endpoint: Endpoint<T>, token: String?): T = withContext(Dispatchers.IO) {
        val request = buildRequest(endpoint, token)
        val (status, body) = try {
            http.newCall(request).execute().use { it.code to it.body.string() }
        } catch (e: IOException) {
            throw ApiError.Network(e.message)
        }

        val envelope = try {
            json.decodeFromString(ApiEnvelope.serializer(endpoint.serializer), body)
        } catch (e: SerializationException) {
            throw if (status >= 500) ApiError.Server("HTTP_$status", "") else ApiError.Decoding
        } catch (e: IllegalArgumentException) {
            throw if (status >= 500) ApiError.Server("HTTP_$status", "") else ApiError.Decoding
        }

        envelope.error?.let { throw ApiError.from(it) }
        if (!envelope.success) throw ApiError.Decoding
        envelope.data ?: throw ApiError.Decoding
    }

    fun <T> buildRequest(endpoint: Endpoint<T>, token: String?): Request {
        val url = apiRoot.newBuilder()
            .addEncodedPathSegments(endpoint.path)
            .apply { endpoint.query.forEach { (key, value) -> addQueryParameter(key, value) } }
            .build()

        val body = when {
            endpoint.jsonBody != null -> endpoint.jsonBody.toRequestBody(JSON_MEDIA_TYPE)
            endpoint.method == HttpMethod.GET -> null
            else -> ByteArray(0).toRequestBody(null)
        }

        return Request.Builder()
            .url(url)
            .method(endpoint.method.name, body)
            .header("Accept", "application/json")
            .apply {
                if (endpoint.requiresAuth && token != null) header("Authorization", "Bearer $token")
            }
            .build()
    }

    companion object {
        private val JSON_MEDIA_TYPE = "application/json".toMediaType()

        val json = Json {
            ignoreUnknownKeys = true
            explicitNulls = false
            coerceInputValues = true
        }

        // Lise scraping can take a while on the server side
        fun defaultHttpClient(): OkHttpClient = OkHttpClient.Builder()
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(45, TimeUnit.SECONDS)
            .build()
    }
}
