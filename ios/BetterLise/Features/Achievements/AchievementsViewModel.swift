import Foundation
import Observation

@MainActor
@Observable
final class AchievementsViewModel {
    private(set) var state: Loadable<[Achievement]> = .idle
    /// Unlocks waiting to be celebrated on this device.
    private(set) var pendingCelebration: [Achievement] = []

    private let session: SessionStore
    private let cache: ResponseCache
    private let defaults: UserDefaults
    private let cacheKey = "achievements"
    private static let seenKeyPrefix = "achievements.seen."

    init(session: SessionStore, cache: ResponseCache, defaults: UserDefaults = .standard) {
        self.session = session
        self.cache = cache
        self.defaults = defaults
    }

    var summary: AchievementSummary { AchievementSummary(state.value ?? []) }

    /// Unlocks earned achievements server-side and refreshes the list.
    func refresh() async {
        guard let username = session.username else { return }
        let cached = state.value ?? cache.load([Achievement].self, key: cacheKey)
        state = .loading(cached: cached)
        do {
            let response = try await session.send(Endpoints.achievements())
            cache.save(response.achievements, key: cacheKey)
            state = .loaded(response.achievements)
            let seen = seenCodes(for: username)
                ?? AchievementCelebration.initialSeen(achievements: response.achievements, newlyUnlocked: response.newlyUnlocked)
            saveSeen(seen, for: username)
            pendingCelebration = AchievementCelebration.pending(achievements: response.achievements, seen: seen)
        } catch {
            state = .failed(message: error.localizedDescription, cached: cached)
        }
    }

    /// The banner was shown (or opened): don't celebrate these again.
    func markCelebrated() {
        guard let username = session.username else { return }
        let seen = (seenCodes(for: username) ?? []).union(pendingCelebration.map(\.code))
        saveSeen(seen, for: username)
        pendingCelebration = []
    }

    /// Forgets cached achievements and celebrations (sign-out and account deletion).
    func reset() {
        state = .idle
        pendingCelebration = []
        cache.save([Achievement](), key: cacheKey)
        for key in defaults.dictionaryRepresentation().keys where key.hasPrefix(Self.seenKeyPrefix) {
            defaults.removeObject(forKey: key)
        }
    }

    private func seenCodes(for username: String) -> Set<String>? {
        (defaults.array(forKey: Self.seenKeyPrefix + username) as? [String]).map(Set.init)
    }

    private func saveSeen(_ codes: Set<String>, for username: String) {
        defaults.set(codes.sorted(), forKey: Self.seenKeyPrefix + username)
    }
}
