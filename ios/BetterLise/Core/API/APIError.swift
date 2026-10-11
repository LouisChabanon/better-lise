import Foundation

enum APIError: Error, Equatable, LocalizedError {
    case unauthorized
    case sessionExpired
    case invalidCredentials(String)
    case validation(String)
    case rateLimited(String)
    case server(code: String, message: String)
    case network(String)
    case decoding

    init(body: APIErrorBody) {
        switch body.code {
        case "UNAUTHORIZED": self = .unauthorized
        case "SESSION_EXPIRED": self = .sessionExpired
        case "INVALID_CREDENTIALS": self = .invalidCredentials(body.message)
        case "VALIDATION": self = .validation(body.message)
        case "RATE_LIMITED": self = .rateLimited(body.message)
        default: self = .server(code: body.code, message: body.message)
        }
    }

    /// Errors that a fresh login can fix.
    var requiresReauthentication: Bool {
        self == .unauthorized || self == .sessionExpired
    }

    var errorDescription: String? {
        switch self {
        case .unauthorized, .sessionExpired:
            "Ta session a expiré. Reconnecte-toi."
        case .invalidCredentials(let message), .validation(let message), .rateLimited(let message):
            message
        case .server(let code, _) where code == "LISE_UNAVAILABLE":
            "Lise ne répond pas pour le moment. Réessaie dans quelques instants."
        case .server:
            "Une erreur est survenue sur le serveur."
        case .network:
            "Impossible de joindre Better Lise. Vérifie ta connexion."
        case .decoding:
            "Réponse inattendue du serveur."
        }
    }
}
