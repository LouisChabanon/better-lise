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

    init(baseURL: URL = AppEnvironment.configuredBaseURL) {
        let client = APIClient(baseURL: baseURL)
        cache = ResponseCache()
        settings = SettingsStore()
        session = SessionStore(client: client, secureStore: KeychainStore())
        agenda = AgendaViewModel(session: session, settings: settings, cache: cache)
        grades = GradesViewModel(session: session, cache: cache)
        absences = AbsencesViewModel(session: session, cache: cache)
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
