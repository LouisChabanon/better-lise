import Foundation

/// Estimated progress of a Lise scrape. The server gives no real progress, so the curve eases
/// towards 95 % around the expected duration, then crawls without ever reaching 100 % on its own.
struct ScraperProgress: Sendable {
    /// Same phases as the web app (hooks/useScraperLoading.ts).
    static let phases: [(threshold: Double, message: String)] = [
        (10, "Initialisation..."),
        (25, "Préparation de la requête..."),
        (35, "Contact du serveur..."),
        (50, "Connexion à LISE..."),
        (60, "Navigation dans l'interface..."),
        (75, "Récupération des données..."),
        (90, "Finalisation de l'analyse..."),
    ]

    private static let start = 5.0
    private static let easedTarget = 95.0
    private static let ceiling = 99.0

    let expectedDuration: TimeInterval

    func progress(elapsed: TimeInterval) -> Double {
        let t = max(elapsed, 0)
        // ~90 % reached at the expected duration (1 - e^-2.5 ≈ 0.92 of the eased range)
        let timeConstant = max(expectedDuration, 1) / 2.5
        let eased = Self.start + (Self.easedTarget - Self.start) * (1 - exp(-t / timeConstant))
        let overtime = max(t - expectedDuration * 1.5, 0)
        let crawl = min(overtime * 0.1, Self.ceiling - Self.easedTarget)
        return min(eased + crawl, Self.ceiling)
    }

    static func message(for progress: Double) -> String {
        phases.first { $0.threshold > progress }?.message ?? phases[phases.count - 1].message
    }

    /// Vertical position of the scanning laser (0…1). Unlike the web (which completes at 70 %), the
    /// scan spans the whole eased range so the page never looks finished while Lise is still working.
    static func scanFraction(for progress: Double) -> Double {
        min(max((progress - 10) / 85, 0), 1)
    }
}

/// Lifecycle of a Lise sync, driving the loading UI.
enum SyncState: Equatable {
    /// How long "Terminé" stays on screen once Lise answered (same as the web app).
    static let completionDisplayDuration: Duration = .milliseconds(800)

    case idle
    case syncing(startedAt: Date, hasContent: Bool)
    case finished(startedAt: Date, hasContent: Bool)

    var startedAt: Date? {
        switch self {
        case .idle: nil
        case .syncing(let date, _), .finished(let date, _): date
        }
    }

    /// Nothing to show yet: the full loading animation replaces the screen.
    var showsFullLoader: Bool {
        switch self {
        case .syncing(_, false), .finished(_, false): true
        default: false
        }
    }

    /// Cached content is visible: a compact progress pill floats above it.
    var showsCompactLoader: Bool {
        switch self {
        case .syncing(_, true), .finished(_, true): true
        default: false
        }
    }

    var isFinished: Bool {
        if case .finished = self { return true }
        return false
    }
}
