package com.betterlise.app.data.api

import kotlinx.serialization.KSerializer
import kotlinx.serialization.json.Json

enum class HttpMethod { GET, POST, PUT, PATCH, DELETE }

data class Endpoint<T>(
    val method: HttpMethod,
    val path: String,
    val serializer: KSerializer<T>,
    val query: Map<String, String> = emptyMap(),
    val jsonBody: String? = null,
    val requiresAuth: Boolean = true,
)

object Endpoints {
    private val json = Json { encodeDefaults = false; explicitNulls = false }

    fun login(username: String, password: String) = Endpoint(
        method = HttpMethod.POST,
        path = "auth/login",
        serializer = LoginResponse.serializer(),
        jsonBody = json.encodeToString(LoginRequest.serializer(), LoginRequest(username, password)),
        requiresAuth = false,
    )

    fun logout() = Endpoint(HttpMethod.POST, "auth/logout", LogoutResponse.serializer())

    fun profile() = Endpoint(HttpMethod.GET, "me", Profile.serializer())

    fun updateProfile(promo: String?, tbk: String?) = Endpoint(
        method = HttpMethod.PATCH,
        path = "me",
        serializer = Profile.serializer(),
        jsonBody = json.encodeToString(ProfilePatch.serializer(), ProfilePatch(promo, tbk)),
    )

    /** Deletes the Better Lise account and its stored data. The Lise account is not affected. */
    fun deleteAccount() = Endpoint(HttpMethod.DELETE, "me", AccountDeletionResponse.serializer())

    fun agenda(liseId: String, tbk: String, includeRu: Boolean) = Endpoint(
        method = HttpMethod.GET,
        path = "agenda",
        serializer = AgendaResponse.serializer(),
        query = mapOf("liseId" to liseId, "tbk" to tbk, "ru" to includeRu.toString()),
        requiresAuth = false,
    )

    fun grades(refresh: Boolean) = Endpoint(
        method = HttpMethod.GET,
        path = "grades",
        serializer = GradesResponse.serializer(),
        query = mapOf("refresh" to refresh.toString()),
    )

    fun gradeStats(code: String) = Endpoint(
        method = HttpMethod.GET,
        path = "grades/${encodeSegment(code)}/stats",
        serializer = GradeStats.serializer(),
    )

    fun markGradeOpened(code: String) = Endpoint(
        method = HttpMethod.POST,
        path = "grades/${encodeSegment(code)}/opened",
        serializer = MarkOpenedResponse.serializer(),
    )

    /** Reveal mode replay: hides the grade again until it is revealed. */
    fun markGradeNew(code: String) = Endpoint(
        method = HttpMethod.POST,
        path = "grades/${encodeSegment(code)}/new",
        serializer = MarkOpenedResponse.serializer(),
    )

    fun absences() = Endpoint(HttpMethod.GET, "absences", AbsencesResponse.serializer())

    /** Unlocks earned achievements, then lists all of them. */
    fun achievements() = Endpoint(HttpMethod.GET, "achievements", AchievementsResponse.serializer())

    /** Community coefficients used by the grade simulator. */
    fun communityWeights() = Endpoint(HttpMethod.GET, "grades/weights", CommunityWeightsResponse.serializer())

    /** Shares the user's coefficient for a grade with the community. */
    fun voteWeight(code: String, weight: Double) = Endpoint(
        method = HttpMethod.PUT,
        path = "grades/${encodeSegment(code)}/weight",
        serializer = WeightVoteResponse.serializer(),
        jsonBody = json.encodeToString(WeightVoteRequest.serializer(), WeightVoteRequest(weight)),
    )

    fun health() = Endpoint(HttpMethod.GET, "health", LiseHealth.serializer(), requiresAuth = false)

    // Encoded path segments survive HttpUrl.addEncodedPathSegments untouched
    private fun encodeSegment(value: String): String =
        java.net.URLEncoder.encode(value, "UTF-8").replace("+", "%20")
}
