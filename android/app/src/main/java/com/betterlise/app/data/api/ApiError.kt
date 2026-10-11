package com.betterlise.app.data.api

sealed class ApiError(message: String) : Exception(message) {
    data object Unauthorized : ApiError("Ta session a expiré. Reconnecte-toi.")
    data object SessionExpired : ApiError("Ta session a expiré. Reconnecte-toi.")
    data class InvalidCredentials(val detail: String) : ApiError(detail)
    data class Validation(val detail: String) : ApiError(detail)
    data class RateLimited(val detail: String) : ApiError(detail)
    data class Server(val code: String, val detail: String) : ApiError(
        if (code == "LISE_UNAVAILABLE") {
            "Lise ne répond pas pour le moment. Réessaie dans quelques instants."
        } else {
            "Une erreur est survenue sur le serveur."
        },
    )
    data class Network(val detail: String?) : ApiError("Impossible de joindre Better Lise. Vérifie ta connexion.")
    data object Decoding : ApiError("Réponse inattendue du serveur.")

    /** Errors that a fresh login can fix. */
    val requiresReauthentication: Boolean get() = this is Unauthorized || this is SessionExpired

    companion object {
        fun from(body: ApiErrorBody): ApiError = when (body.code) {
            "UNAUTHORIZED" -> Unauthorized
            "SESSION_EXPIRED" -> SessionExpired
            "INVALID_CREDENTIALS" -> InvalidCredentials(body.message)
            "VALIDATION" -> Validation(body.message)
            "RATE_LIMITED" -> RateLimited(body.message)
            else -> Server(body.code, body.message)
        }
    }
}
