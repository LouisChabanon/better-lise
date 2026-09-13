import Foundation
import Observation

/// Tracks how fast Lise currently answers so loading screens can pace themselves on reality.
@MainActor
@Observable
final class LiseHealthMonitor {
    nonisolated static let defaultDuration: TimeInterval = 10
    private nonisolated static let minimumSamples = 4
    private static let refreshInterval: TimeInterval = 5 * 60
    private nonisolated static let slowThreshold: TimeInterval = 15

    private(set) var health: LiseHealth?
    private var fetchedAt: Date?
    private let session: SessionStore

    init(session: SessionStore) {
        self.session = session
    }

    var expectedSyncDuration: TimeInterval { Self.expectedDuration(for: health) }
    var slowNotice: String? { Self.slowNotice(for: health) }

    func refreshIfNeeded(now: Date = Date()) async {
        if let fetchedAt, now.timeIntervalSince(fetchedAt) < Self.refreshInterval { return }
        fetchedAt = now
        // Pacing is cosmetic: keep the previous estimate if the server can't be reached
        if let health = try? await session.sendPublic(Endpoints.health()) {
            self.health = health
        }
    }

    nonisolated static func expectedDuration(for health: LiseHealth?) -> TimeInterval {
        guard let health, health.count >= minimumSamples, health.avgDuration > 0 else { return defaultDuration }
        return min(max(health.avgDuration / 1000, 3), 60)
    }

    nonisolated static func slowNotice(for health: LiseHealth?) -> String? {
        guard let health, health.count >= minimumSamples else { return nil }
        let seconds = health.avgDuration / 1000
        guard seconds > slowThreshold else { return nil }
        return "Lise est lente en ce moment (≈ \(Int(seconds)) s par synchronisation)."
    }
}
