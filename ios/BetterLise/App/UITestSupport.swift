#if DEBUG
import Foundation

/// DEBUG-only hooks for UI tests: `-uiTestStubAPI YES` swaps the network for canned responses and a
/// signed-in session, so flows behind login (reveal mode) can run without a backend. Never compiled in Release.
enum UITestSupport {
    static var isStubbingAPI: Bool {
        UserDefaults.standard.bool(forKey: "uiTestStubAPI")
    }

    static func makeStubbedSession() -> URLSession {
        let configuration = URLSessionConfiguration.ephemeral
        configuration.protocolClasses = [UITestAPIStub.self]
        return URLSession(configuration: configuration)
    }

    /// Simulations and celebrated achievements start empty on every launch.
    static func makeEphemeralDefaults() -> UserDefaults {
        UserDefaults(suiteName: "uiTest.\(UUID().uuidString)") ?? .standard
    }

    static func makeSignedInStore() -> SecureStore {
        let store = InMemorySecureStore()
        store.set("ui-test-token", for: "session.token")
        store.set("2023-1234", for: "session.username")
        return store
    }
}

final class UITestAPIStub: URLProtocol, @unchecked Sendable {
    private static let lock = NSLock()
    nonisolated(unsafe) private static var mataIsNew = true

    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }

    override func startLoading() {
        let path = request.url?.path ?? ""
        let data: String = Self.lock.withLock {
            switch true {
            case request.httpMethod == "DELETE" && path.hasSuffix("/me"):
                return #"{"deleted":true}"#
            case path.hasSuffix("/grades/MATA/opened"):
                Self.mataIsNew = false
                return #"{"updated":1}"#
            case path.hasSuffix("/grades/MATA/new"):
                Self.mataIsNew = true
                return #"{"updated":1}"#
            case path.hasSuffix("/achievements"):
                return Self.achievementsJSON
            case path.hasSuffix("/grades/weights"):
                return #"{"weights":{"MDSA":2}}"#
            case request.httpMethod == "PUT" && path.hasSuffix("/weight"):
                return #"{"code":"MDSA","weight":3}"#
            case path.hasSuffix("/stats"):
                return #"{"avg":12.4,"min":3,"max":19.5,"count":42,"median":12,"stdDeviation":3.2,"distribution":{"labels":["0-2","2-4","4-6","6-8","8-10","10-12","12-14","14-16","16-18","18-20"],"counts":[0,1,2,4,6,9,8,6,4,2]}}"#
            case path.hasSuffix("/grades"):
                return #"{"grades":[{"date":"02/02/2025","code":"MATA","libelle":"DS Matériaux","note":18.5,"absence":"","comment":"","teachers":"M. Morel","isNew":\#(Self.mataIsNew)},{"date":"12/01/2025","code":"MDSA","libelle":"DS Mécanique","note":11,"absence":"","comment":"","teachers":"","isNew":false}]}"#
            case path.hasSuffix("/health"):
                return #"{"avgDuration":1500,"count":10}"#
            case path.hasSuffix("/agenda"):
                return Self.agendaJSON()
            default:
                return "null"
            }
        }
        let body = Data(#"{"success":true,"data":\#(data),"error":null}"#.utf8)
        // Scraping endpoints take a moment, like the real server; UI tests can slow the agenda further
        let agendaDelay = UserDefaults.standard.double(forKey: "uiTestAgendaDelay")
        let delay: TimeInterval = path.hasSuffix("/grades") ? 0.4 : (path.hasSuffix("/agenda") ? agendaDelay : 0)
        DispatchQueue.global().asyncAfter(deadline: .now() + delay) { [self] in
            guard let url = request.url,
                  let response = HTTPURLResponse(url: url, statusCode: 200, httpVersion: nil, headerFields: nil) else { return }
            client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
            client?.urlProtocol(self, didLoad: body)
            client?.urlProtocolDidFinishLoading(self)
        }
    }

    override func stopLoading() {}

    private static let achievementsJSON = #"{"achievements":[{"code":"FIRST_LOGIN","title":"Sal'ss!","description":"Connectez-vous pour la première fois.","snark":null,"icon":"rocket","rarity":"Common","isSecret":false,"unlockedAt":"2025-01-02T10:00:00.000Z"},{"code":"DIEU_MATA","title":"Dieu des matériaux","description":"Obtenir plus de 18/20 à un DS de MATA","snark":"Même l'archi Morel n'est pas autant un maxeur","icon":"experiment","rarity":"Legendary","isSecret":false,"unlockedAt":"2025-02-02T10:00:00.000Z"},{"code":"SACQUE","title":"???","description":null,"snark":null,"icon":null,"rarity":"Legendary","isSecret":true,"unlockedAt":null}],"newlyUnlocked":[]}"#

    /// One class per school day of the current and next week, so pages have content to render.
    private static func agendaJSON() -> String {
        let calendar = Calendar.paris
        let formatter = ISO8601DateFormatter()
        let days = AgendaLayout.schoolDays(around: Date(), weeksBefore: 1, weeksAfter: 1)
        let events = days.compactMap { day -> String? in
            guard let start = calendar.date(bySettingHour: 8, minute: 0, second: 0, of: day),
                  let end = calendar.date(bySettingHour: 10, minute: 0, second: 0, of: day) else { return nil }
            return #"{"title":"Mécanique","startDate":"\#(formatter.string(from: start))","endDate":"\#(formatter.string(from: end))","room":"A1","type":"CM","isAllDay":false}"#
        }
        return #"{"events":[\#(events.joined(separator: ","))]}"#
    }
}
#endif
