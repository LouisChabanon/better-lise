import Foundation

/// Composition root: builds the shared stores and view models once.
@MainActor
final class AppEnvironment {
    let session: SessionStore
    let settings: SettingsStore
    let cache: ResponseCache
    let agenda: AgendaViewModel
    let grades: GradesViewModel
    let absences: AbsencesViewModel
    let health: LiseHealthMonitor

    init(baseURL: URL = AppEnvironment.configuredBaseURL) {
        var client = APIClient(baseURL: baseURL)
        var secureStore: SecureStore = KeychainStore()
        var cache = ResponseCache()
        #if DEBUG
        if UITestSupport.isStubbingAPI {
            client = APIClient(baseURL: URL(string: "https://ui-test.invalid")!, session: UITestSupport.makeStubbedSession())
            secureStore = UITestSupport.makeSignedInStore()
            cache = ResponseCache(directory: FileManager.default.temporaryDirectory.appending(path: UUID().uuidString))
        }
        #endif
        self.cache = cache
        settings = SettingsStore()
        session = SessionStore(client: client, secureStore: secureStore)
        agenda = AgendaViewModel(session: session, settings: settings, cache: cache)
        health = LiseHealthMonitor(session: session)
        grades = GradesViewModel(session: session, cache: cache, health: health)
        absences = AbsencesViewModel(session: session, cache: cache, health: health)
    }

    static var configuredBaseURL: URL {
        let raw = Bundle.main.object(forInfoDictionaryKey: "BLAPIBaseURL") as? String
        return raw.flatMap(URL.init(string:)) ?? URL(string: "https://www.better-lise.com")!
    }

    func signOut() async {
        await session.signOut()
        cache.clear()
        grades.reset()
        absences.reset()
    }
}
