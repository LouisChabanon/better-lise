import Foundation

enum HTTPMethod: String, Sendable {
    case get = "GET"
    case post = "POST"
    case patch = "PATCH"
}

struct Endpoint<Response: Decodable>: Sendable {
    let method: HTTPMethod
    let path: String
    var query: [URLQueryItem] = []
    var body: Data?
    var requiresAuth = true
}

enum Endpoints {
    private static let encoder = JSONEncoder()

    static func login(username: String, password: String) -> Endpoint<LoginResponse> {
        Endpoint(
            method: .post,
            path: "auth/login",
            body: try? encoder.encode(LoginRequest(username: username, password: password)),
            requiresAuth: false
        )
    }

    static func logout() -> Endpoint<LogoutResponse> {
        Endpoint(method: .post, path: "auth/logout")
    }

    static func profile() -> Endpoint<Profile> {
        Endpoint(method: .get, path: "me")
    }

    static func updateProfile(promo: String? = nil, tbk: String? = nil) -> Endpoint<Profile> {
        Endpoint(method: .patch, path: "me", body: try? encoder.encode(ProfilePatch(promo: promo, tbk: tbk)))
    }

    static func agenda(liseId: String, tbk: String, includeRU: Bool) -> Endpoint<AgendaResponse> {
        Endpoint(
            method: .get,
            path: "agenda",
            query: [
                URLQueryItem(name: "liseId", value: liseId),
                URLQueryItem(name: "tbk", value: tbk),
                URLQueryItem(name: "ru", value: includeRU ? "true" : "false"),
            ],
            requiresAuth: false
        )
    }

    static func grades(refresh: Bool) -> Endpoint<GradesResponse> {
        Endpoint(method: .get, path: "grades", query: [URLQueryItem(name: "refresh", value: refresh ? "true" : "false")])
    }

    static func gradeStats(code: String) -> Endpoint<GradeStats> {
        Endpoint(method: .get, path: "grades/\(encodePathSegment(code))/stats")
    }

    static func markGradeOpened(code: String) -> Endpoint<MarkOpenedResponse> {
        Endpoint(method: .post, path: "grades/\(encodePathSegment(code))/opened")
    }

    static func health() -> Endpoint<LiseHealth> {
        Endpoint(method: .get, path: "health", requiresAuth: false)
    }

    /// Casino mode replay: puts the grade back behind the lootbox.
    static func markGradeNew(code: String) -> Endpoint<MarkOpenedResponse> {
        Endpoint(method: .post, path: "grades/\(encodePathSegment(code))/new")
    }

    static func absences() -> Endpoint<AbsencesResponse> {
        Endpoint(method: .get, path: "absences")
    }

    private static func encodePathSegment(_ value: String) -> String {
        var allowed = CharacterSet.urlPathAllowed
        allowed.remove(charactersIn: "/")
        return value.addingPercentEncoding(withAllowedCharacters: allowed) ?? value
    }
}
