import Foundation
import Observation

@MainActor
@Observable
final class AbsencesViewModel {
    private(set) var state: Loadable<AbsencesResponse> = .idle
    private(set) var syncState: SyncState = .idle

    let health: LiseHealthMonitor
    private let session: SessionStore
    private let cache: ResponseCache
    private let cacheKey = "absences"

    init(session: SessionStore, cache: ResponseCache, health: LiseHealthMonitor) {
        self.session = session
        self.cache = cache
        self.health = health
    }

    func load() async {
        let cached = cache.load(AbsencesResponse.self, key: cacheKey) ?? state.value
        state = .loading(cached: cached)
        let startedAt = Date()
        let hasContent = cached != nil
        syncState = .syncing(startedAt: startedAt, hasContent: hasContent)
        Task { await health.refreshIfNeeded() }

        do {
            let response = try await session.send(Endpoints.absences())
            cache.save(response, key: cacheKey)
            state = .loaded(response)
            completeSync(startedAt: startedAt, hasContent: hasContent)
        } catch {
            syncState = .idle
            state = .failed(message: error.localizedDescription, cached: cached)
        }
    }

    /// Shows the "Terminé" state briefly, like the web app, before revealing the content.
    private func completeSync(startedAt: Date, hasContent: Bool) {
        syncState = .finished(startedAt: startedAt, hasContent: hasContent)
        Task {
            try? await Task.sleep(for: SyncState.completionDisplayDuration)
            if syncState == .finished(startedAt: startedAt, hasContent: hasContent) {
                syncState = .idle
            }
        }
    }

    func reset() {
        state = .idle
        syncState = .idle
    }
}
