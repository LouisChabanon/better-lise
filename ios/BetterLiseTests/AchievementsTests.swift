import Foundation
import Testing
@testable import BetterLise

private func achievement(_ code: String, rarity: AchievementRarity = .common, secret: Bool = false, unlocked: Bool) -> Achievement {
    Achievement(
        code: code,
        title: secret && !unlocked ? "???" : code,
        description: nil,
        snark: nil,
        icon: nil,
        rarity: rarity,
        isSecret: secret,
        unlockedAt: unlocked ? Date(timeIntervalSince1970: 0) : nil
    )
}

struct AchievementRulesTests {
    @Test func summarizesProgress() {
        let summary = AchievementSummary([
            achievement("A", unlocked: true),
            achievement("B", rarity: .rare, unlocked: true),
            achievement("C", rarity: .legendary, secret: true, unlocked: true),
            achievement("D", rarity: .legendary, secret: true, unlocked: false),
        ])
        #expect(summary.total == 4 && summary.unlocked == 3)
        #expect(summary.legendary == 1 && summary.rare == 1)
        #expect(summary.secrets == 2 && summary.secretsFound == 1)
        #expect(summary.progress == 0.75)
        #expect(AchievementSummary([]).progress == 0)
    }

    @Test func firstRunOnlyCelebratesWhatThisSyncUnlocked() {
        let list = [achievement("OLD", unlocked: true), achievement("NEW", unlocked: true), achievement("LOCKED", unlocked: false)]
        let seen = AchievementCelebration.initialSeen(achievements: list, newlyUnlocked: ["NEW"])
        #expect(seen == ["OLD"])
        #expect(AchievementCelebration.pending(achievements: list, seen: seen).map(\.code) == ["NEW"])
    }

    @Test func defersOnlyWhileRevealModeHidesGrades() {
        #expect(AchievementCelebration.shouldDefer(revealMode: true, unreadGrades: 1))
        #expect(!AchievementCelebration.shouldDefer(revealMode: true, unreadGrades: 0))
        #expect(!AchievementCelebration.shouldDefer(revealMode: false, unreadGrades: 3))
    }

    @Test func mapsIconsWithAFallback() {
        #expect(AchievementSymbol.name(for: "trophy") == "trophy.fill")
        #expect(AchievementSymbol.name(for: "unknown") == "star.fill")
        #expect(AchievementSymbol.name(for: nil) == "star.fill")
    }
}

@MainActor
@Suite(.serialized)
struct AchievementsViewModelTests {
    private let firstJSON = #"{"achievements":[{"code":"FIRST_LOGIN","title":"Sal'ss!","description":"d","snark":null,"icon":"rocket","rarity":"Common","isSecret":false,"unlockedAt":"2025-01-02T10:00:00.000Z"},{"code":"ACADEMIC_GOAT","title":"Birseur fou","description":"d","snark":null,"icon":"trophy","rarity":"Rare","isSecret":false,"unlockedAt":"2025-03-02T10:00:00.000Z"},{"code":"SACQUE","title":"???","description":null,"snark":null,"icon":null,"rarity":"Legendary","isSecret":true,"unlockedAt":null}],"newlyUnlocked":["ACADEMIC_GOAT"]}"#
    private let laterJSON = #"{"achievements":[{"code":"FIRST_LOGIN","title":"Sal'ss!","description":"d","snark":null,"icon":"rocket","rarity":"Common","isSecret":false,"unlockedAt":"2025-01-02T10:00:00.000Z"},{"code":"ACADEMIC_GOAT","title":"Birseur fou","description":"d","snark":null,"icon":"trophy","rarity":"Rare","isSecret":false,"unlockedAt":"2025-03-02T10:00:00.000Z"},{"code":"SACQUE","title":"Ami Sacqué","description":"d","snark":"s","icon":"reload","rarity":"Mythic","isSecret":true,"unlockedAt":"2025-04-02T10:00:00Z"}],"newlyUnlocked":[]}"#

    private func makeModel(defaults: UserDefaults) -> AchievementsViewModel {
        let store = InMemorySecureStore()
        store.set("token", for: "session.token")
        store.set("2023-1234", for: "session.username")
        let client = APIClient(baseURL: URL(string: "http://localhost:3000")!, session: StubURLProtocol.makeSession())
        return AchievementsViewModel(
            session: SessionStore(client: client, secureStore: store),
            cache: ResponseCache(directory: FileManager.default.temporaryDirectory.appending(path: UUID().uuidString)),
            defaults: defaults
        )
    }

    @Test func celebratesNewUnlocksOnceAcrossLaunches() async throws {
        let suite = "tests.\(UUID().uuidString)"
        let defaults = try #require(UserDefaults(suiteName: suite))
        defer { defaults.removePersistentDomain(forName: suite) }

        StubURLProtocol.reset([Fixtures.success(firstJSON, path: "/achievements"), Fixtures.success(laterJSON, path: "/achievements")])
        let model = makeModel(defaults: defaults)
        await model.refresh()

        #expect(model.pendingCelebration.map(\.code) == ["ACADEMIC_GOAT"])
        let masked = try #require(model.state.value?.last)
        #expect(masked.isHidden && masked.description == nil)
        #expect(model.summary.secretsFound == 0)

        model.markCelebrated()
        #expect(model.pendingCelebration.isEmpty)

        // Next launch: the secret was unlocked meanwhile, and an unknown rarity falls back to common
        let relaunched = makeModel(defaults: defaults)
        await relaunched.refresh()
        #expect(relaunched.pendingCelebration.map(\.code) == ["SACQUE"])
        #expect(relaunched.state.value?.last?.rarity == .common)
    }

    @Test func keepsCachedAchievementsWhenTheServerFails() async throws {
        let suite = "tests.\(UUID().uuidString)"
        let defaults = try #require(UserDefaults(suiteName: suite))
        defer { defaults.removePersistentDomain(forName: suite) }

        StubURLProtocol.reset([Fixtures.success(firstJSON, path: "/achievements"), Fixtures.failure(500, code: "INTERNAL", path: "/achievements")])
        let model = makeModel(defaults: defaults)
        await model.refresh()
        await model.refresh()

        #expect(model.state.errorMessage != nil)
        #expect(model.state.value?.count == 3)
    }
}

@Suite(.serialized)
struct LiseHealthDecodingTests {
    let client = APIClient(baseURL: URL(string: "http://localhost:3000")!, session: StubURLProtocol.makeSession())

    @Test func decodesOlderAndNewerHealthPayloads() async throws {
        StubURLProtocol.reset([
            Fixtures.success(#"{"avgDuration":1500,"count":10}"#),
            Fixtures.success(#"{"avgDuration":16000,"count":10,"status":"slow","hourly":[{"hour":"2025-03-10T10:00:00.000Z","avgDuration":16000,"count":10,"failures":1}]}"#),
        ])

        let old = try await client.send(Endpoints.health(), token: nil)
        #expect(old.liseStatus == .unknown)
        #expect(old.hourly == nil)

        let new = try await client.send(Endpoints.health(), token: nil)
        #expect(new.liseStatus == .slow)
        #expect(new.hourly?.first?.failures == 1)
    }
}
