import Foundation
import Testing
@testable import BetterLise

@MainActor
@Suite(.serialized)
struct GradesViewModelTests {
    private let gradesJSON = #"{"grades":[{"date":"02/02/2025","code":"MATA","libelle":"DS Matériaux","note":18.5,"absence":"","comment":"","teachers":"","isNew":false}]}"#

    private func makeModel() -> GradesViewModel {
        let store = InMemorySecureStore()
        store.set("token", for: "session.token")
        store.set("2023-1234", for: "session.username")
        let client = APIClient(baseURL: URL(string: "http://localhost:3000")!, session: StubURLProtocol.makeSession())
        let session = SessionStore(client: client, secureStore: store)
        return GradesViewModel(
            session: session,
            cache: ResponseCache(directory: FileManager.default.temporaryDirectory.appending(path: UUID().uuidString)),
            health: LiseHealthMonitor(session: session)
        )
    }

    @Test func markNewHidesTheGradeAgainAndPersistsIt() async throws {
        StubURLProtocol.reset([
            Fixtures.success(gradesJSON, path: "/grades"),
            Fixtures.success(#"{"updated":1}"#, path: "/grades/MATA/new"),
        ])
        let model = makeModel()
        await model.load()
        let grade = try #require(model.state.value?.first)

        await model.markNew(grade)

        #expect(model.state.value?.first?.isUnread == true)
        #expect(StubURLProtocol.recordedRequests().contains { $0.url?.path == "/api/v1/grades/MATA/new" })
    }

    @Test func markNewUsesTheCurrentStateNotAStaleCopy() async throws {
        StubURLProtocol.reset([
            Fixtures.success(gradesJSON, path: "/grades"),
            Fixtures.success(#"{"updated":1}"#, path: "/grades/MATA/new"),
        ])
        let model = makeModel()
        await model.load()
        // Copy captured while the grade was still new (before the casino reveal marked it opened)
        let stale = Grade(copying: try #require(model.state.value?.first), isNew: true)

        await model.markNew(stale)

        #expect(model.state.value?.first?.isUnread == true)
    }

    @Test func markNewRollsBackWhenTheServerFails() async throws {
        StubURLProtocol.reset([
            Fixtures.success(gradesJSON, path: "/grades"),
            Fixtures.failure(500, code: "INTERNAL", path: "/grades/MATA/new"),
        ])
        let model = makeModel()
        await model.load()
        let grade = try #require(model.state.value?.first)

        await model.markNew(grade)

        #expect(model.state.value?.first?.isUnread == false)
        #expect(model.state.errorMessage != nil)
    }
}
