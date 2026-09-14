package com.betterlise.app.data.api

import kotlinx.serialization.KSerializer
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.descriptors.PrimitiveKind
import kotlinx.serialization.descriptors.PrimitiveSerialDescriptor
import kotlinx.serialization.encoding.Decoder
import kotlinx.serialization.encoding.Encoder
import java.time.Instant

object InstantSerializer : KSerializer<Instant> {
    override val descriptor = PrimitiveSerialDescriptor("Instant", PrimitiveKind.STRING)
    override fun serialize(encoder: Encoder, value: Instant) = encoder.encodeString(value.toString())
    override fun deserialize(decoder: Decoder): Instant = Instant.parse(decoder.decodeString())
}

@Serializable
data class ApiEnvelope<T>(
    val success: Boolean,
    val data: T? = null,
    val error: ApiErrorBody? = null,
)

@Serializable
data class ApiErrorBody(val code: String, val message: String)

@Serializable
data class LoginRequest(val username: String, val password: String)

@Serializable
data class LoginResponse(
    val token: String,
    val username: String,
    @Serializable(with = InstantSerializer::class) val expiresAt: Instant,
)

@Serializable
data class LogoutResponse(val loggedOut: Boolean)

@Serializable
data class AccountDeletionResponse(val deleted: Boolean)

@Serializable
data class Profile(
    val username: String,
    @SerialName("class") val promo: String? = null,
    val tbk: String? = null,
    val currentStreak: Int = 0,
)

@Serializable
data class ProfilePatch(
    @SerialName("class") val promo: String? = null,
    val tbk: String? = null,
)

@Serializable
data class CalendarEvent(
    val title: String,
    @Serializable(with = InstantSerializer::class) val startDate: Instant,
    @Serializable(with = InstantSerializer::class) val endDate: Instant,
    val summary: String? = null,
    val room: String? = null,
    val teacher: String? = null,
    val group: String? = null,
    val type: String? = null,
    val isAllDay: Boolean = false,
) {
    val id: String get() = "$title-${startDate.epochSecond}-${endDate.epochSecond}"
    val kind: EventKind get() = EventKind.from(type)
}

enum class EventKind(val label: String) {
    Lecture("Cours magistral"),
    Exam("Examen"),
    SelfStudy("Travail autonome"),
    Tutorial("ED / TD"),
    Practical("TP"),
    Restaurant("Restaurant universitaire"),
    Project("Projet"),
    Other("Activité");

    companion object {
        fun from(raw: String?): EventKind = when (raw?.uppercase()) {
            "CM" -> Lecture
            "EXAMEN", "TEST" -> Exam
            "TRAVAIL_AUTONOME" -> SelfStudy
            "ED_TD" -> Tutorial
            "TPS" -> Practical
            "RU" -> Restaurant
            "PROJET" -> Project
            else -> Other
        }
    }
}

@Serializable
data class AgendaResponse(val events: List<CalendarEvent>)

@Serializable
data class Grade(
    val date: String,
    val code: String,
    val libelle: String,
    val note: Double,
    val absence: String = "",
    val comment: String = "",
    val teachers: String = "",
    val isNew: Boolean? = null,
) {
    val isUnread: Boolean get() = isNew == true
}

@Serializable
data class GradesResponse(val grades: List<Grade>)

@Serializable
data class GradeStats(
    val avg: Double,
    val min: Double,
    val max: Double,
    val count: Int,
    val median: Double,
    val stdDeviation: Double,
    val distribution: Distribution,
) {
    @Serializable
    data class Distribution(val labels: List<String>, val counts: List<Int>)
}

@Serializable
data class Absence(
    val date: String,
    val motif: String,
    val cours: String,
    val intervenants: String,
    val matiere: String,
    val horaire: String,
    val duree: String,
)

@Serializable
data class AbsenceStat(
    val code: String,
    val name: String,
    val absentHours: Double,
    val totalUE: Double,
    val percentage: Double,
)

@Serializable
data class AbsencesResponse(
    val nbTotalAbsences: Int,
    val dureeTotaleAbsences: String,
    val absences: List<Absence> = emptyList(),
    val stats: List<AbsenceStat> = emptyList(),
)

@Serializable
data class MarkOpenedResponse(val updated: Int)

/** Recent scraper performance measured by the server ([avgDuration] in milliseconds). */
@Serializable
data class LiseHealth(val avgDuration: Double, val count: Int)
