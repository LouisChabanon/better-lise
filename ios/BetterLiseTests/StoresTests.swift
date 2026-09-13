import Foundation
import Testing
@testable import BetterLise

@MainActor
struct StoresTests {
    @Test func settingsPersistToUserDefaults() throws {
        let suite = "tests.\(UUID().uuidString)"
        let defaults = try #require(UserDefaults(suiteName: suite))
        defer { defaults.removePersistentDomain(forName: suite) }

        let settings = SettingsStore(defaults: defaults)
        #expect(settings.campus == .sibers)
        #expect(settings.showRU)
        #expect(!settings.hasValidLiseId)
        #expect(!settings.casinoMode)

        settings.liseId = "2023-1234"
        settings.campus = .cluny
        settings.promo = .gim2
        settings.showRU = false
        settings.casinoMode = true

        let reloaded = SettingsStore(defaults: defaults)
        #expect(reloaded.liseId == "2023-1234")
        #expect(reloaded.hasValidLiseId)
        #expect(reloaded.campus == .cluny)
        #expect(reloaded.promo == .gim2)
        #expect(!reloaded.showRU)
        #expect(reloaded.casinoMode)
    }

    @Test func liseIdValidation() {
        #expect(LiseID.isValid("2023-1234"))
        #expect(!LiseID.isValid("2023-12345"))
        #expect(!LiseID.isValid("abcd-1234"))
    }

    @Test func responseCacheRoundTrip() throws {
        let directory = FileManager.default.temporaryDirectory.appending(path: UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: directory) }
        let cache = ResponseCache(directory: directory)
        let event = CalendarEvent(title: "RU", startDate: Date(timeIntervalSince1970: 1_741_600_000), endDate: Date(timeIntervalSince1970: 1_741_605_400), summary: "Menu", room: nil, teacher: nil, group: nil, type: "RU", isAllDay: false)

        cache.save([event], key: "agenda/2023-1234")
        #expect(cache.load([CalendarEvent].self, key: "agenda/2023-1234") == [event])

        cache.clear()
        #expect(cache.load([CalendarEvent].self, key: "agenda/2023-1234") == nil)
    }

    @Test func eventKinds() {
        #expect(EventKind(rawType: "TEST") == .exam)
        #expect(EventKind(rawType: "ru") == .restaurant)
        #expect(EventKind(rawType: nil) == .other)
    }
}
