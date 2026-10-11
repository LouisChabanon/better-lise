import Foundation

struct APIEnvelope<T: Decodable>: Decodable {
    let success: Bool
    let data: T?
    let error: APIErrorBody?
}

struct APIErrorBody: Codable, Equatable, Sendable {
    let code: String
    let message: String
}

struct EmptyBody: Codable, Sendable {}

struct LoginRequest: Codable, Sendable {
    let username: String
    let password: String
}

struct LoginResponse: Codable, Equatable, Sendable {
    let token: String
    let username: String
    let expiresAt: Date
}

struct Profile: Codable, Equatable, Sendable {
    let username: String
    let promo: String?
    let tbk: String?
    let currentStreak: Int

    enum CodingKeys: String, CodingKey {
        case username, tbk, currentStreak
        case promo = "class"
    }
}

struct ProfilePatch: Codable, Sendable {
    let promo: String?
    let tbk: String?

    enum CodingKeys: String, CodingKey {
        case tbk
        case promo = "class"
    }
}

struct CalendarEvent: Codable, Hashable, Identifiable, Sendable {
    let title: String
    let startDate: Date
    let endDate: Date
    let summary: String?
    let room: String?
    let teacher: String?
    let group: String?
    let type: String?
    let isAllDay: Bool

    var id: String { "\(title)-\(startDate.timeIntervalSince1970)-\(endDate.timeIntervalSince1970)" }
    var kind: EventKind { EventKind(rawType: type) }
}

enum EventKind: Equatable, Sendable {
    case lecture, exam, selfStudy, tutorial, practical, restaurant, project, other

    init(rawType: String?) {
        switch rawType?.uppercased() {
        case "CM": self = .lecture
        case "EXAMEN", "TEST": self = .exam
        case "TRAVAIL_AUTONOME": self = .selfStudy
        case "ED_TD": self = .tutorial
        case "TPS": self = .practical
        case "RU": self = .restaurant
        case "PROJET": self = .project
        default: self = .other
        }
    }

    var label: String {
        switch self {
        case .lecture: "Cours magistral"
        case .exam: "Examen"
        case .selfStudy: "Travail autonome"
        case .tutorial: "ED / TD"
        case .practical: "TP"
        case .restaurant: "Restaurant universitaire"
        case .project: "Projet"
        case .other: "Activité"
        }
    }
}

struct AgendaResponse: Codable, Sendable {
    let events: [CalendarEvent]
}

struct Grade: Codable, Hashable, Identifiable, Sendable {
    let date: String
    let code: String
    let libelle: String
    let note: Double
    let absence: String
    let comment: String
    let teachers: String
    var isNew: Bool?

    var id: String { code }
    var isUnread: Bool { isNew ?? false }
}

struct GradesResponse: Codable, Sendable {
    let grades: [Grade]
}

struct GradeStats: Codable, Equatable, Sendable {
    struct Distribution: Codable, Equatable, Sendable {
        let labels: [String]
        let counts: [Int]
    }

    let avg: Double
    let min: Double
    let max: Double
    let count: Int
    let median: Double
    let stdDeviation: Double
    let distribution: Distribution
}

struct Absence: Codable, Hashable, Sendable {
    let date: String
    let motif: String
    let cours: String
    let intervenants: String
    let matiere: String
    let horaire: String
    let duree: String
}

struct AbsenceStat: Codable, Hashable, Identifiable, Sendable {
    let code: String
    let name: String
    let absentHours: Double
    let totalUE: Double
    let percentage: Double

    var id: String { code }
}

struct AbsencesResponse: Codable, Equatable, Sendable {
    let nbTotalAbsences: Int
    let dureeTotaleAbsences: String
    let absences: [Absence]
    let stats: [AbsenceStat]
}

struct MarkOpenedResponse: Codable, Sendable {
    let updated: Int
}

struct LogoutResponse: Codable, Sendable {
    let loggedOut: Bool
}

struct AccountDeletionResponse: Codable, Sendable {
    let deleted: Bool
}

/// Recent scraper performance measured by the server (`avgDuration` in milliseconds).
struct LiseHealth: Codable, Equatable, Sendable {
    let avgDuration: Double
    let count: Int
    /// `unknown`, `ok`, `slow` or `very_slow`; missing from older servers.
    var status: String? = nil
    /// Last 24 hours, oldest first; missing from older servers.
    var hourly: [HealthBucket]? = nil

    var liseStatus: LiseHealthStatus { status.flatMap(LiseHealthStatus.init(rawValue:)) ?? .unknown }
}

enum LiseHealthStatus: String, Sendable {
    case unknown
    case ok
    case slow
    case verySlow = "very_slow"
}

struct HealthBucket: Codable, Equatable, Identifiable, Sendable {
    let hour: Date
    /// Average successful sync duration in milliseconds, 0 without any.
    let avgDuration: Double
    let count: Int
    let failures: Int

    var id: Date { hour }
}

enum AchievementRarity: String, Codable, Sendable {
    case common = "Common"
    case rare = "Rare"
    case legendary = "Legendary"

    init(from decoder: Decoder) throws {
        self = AchievementRarity(rawValue: try String(from: decoder)) ?? .common
    }
}

struct Achievement: Codable, Hashable, Identifiable, Sendable {
    let code: String
    /// "???" while a secret achievement is locked.
    let title: String
    let description: String?
    let snark: String?
    let icon: String?
    let rarity: AchievementRarity
    let isSecret: Bool
    let unlockedAt: Date?

    var id: String { code }
    var isUnlocked: Bool { unlockedAt != nil }
    /// Locked secrets are masked by the server.
    var isHidden: Bool { isSecret && !isUnlocked }
}

struct AchievementsResponse: Codable, Equatable, Sendable {
    let achievements: [Achievement]
    /// Codes unlocked by this very request.
    let newlyUnlocked: [String]
}

struct CommunityWeightsResponse: Codable, Sendable {
    let weights: [String: Double]
}

struct WeightVoteRequest: Codable, Sendable {
    let weight: Double
}

struct WeightVoteResponse: Codable, Sendable {
    let code: String
    let weight: Double
}
