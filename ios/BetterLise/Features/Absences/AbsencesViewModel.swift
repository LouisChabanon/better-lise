import Foundation
import Observation

@MainActor
@Observable
final class AbsencesViewModel {
    private(set) var state: Loadable<AbsencesResponse> = .idle

    private let session: SessionStore
    private let cache: ResponseCache
    private let cacheKey = "absences"

    init(session: SessionStore, cache: ResponseCache) {
        self.session = session
        self.cache = cache
    }

    func load() async {
        let cached = cache.load(AbsencesResponse.self, key: cacheKey) ?? state.value
        state = .loading(cached: cached)
        do {
            let response = try await session.send(Endpoints.absences())
            cache.save(response, key: cacheKey)
            state = .loaded(response)
        } catch {
            state = .failed(message: error.localizedDescription, cached: cached)
        }
    }

    func reset() {
        state = .idle
    }
}
