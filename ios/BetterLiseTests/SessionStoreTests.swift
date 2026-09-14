import Foundation
import Testing
@testable import BetterLise

@MainActor
@Suite(.serialized)
struct SessionStoreTests {
    let store = InMemorySecureStore()
    let client = APIClient(baseURL: URL(string: "http://localhost:3000")!, session: StubURLProtocol.makeSession())

    @Test func signInStoresTokenAndOptionallyPassword() async throws {
        StubURLProtocol.reset([Fixtures.login, Fixtures.login])
        let session = SessionStore(client: client, secureStore: store)

        try await session.signIn(username: "2023-1234", password: "pw", remember: false)
        #expect(session.state == .signedIn(username: "2023-1234"))
        #expect(store.string(for: "session.token") == "fresh-token")
        #expect(store.string(for: "session.password") == nil)

        try await session.signIn(username: "2023-1234", password: "pw", remember: true)
        #expect(store.string(for: "session.password") == "pw")
    }

    @Test func restoresSignedInStateFromStore() {
        store.set("t", for: "session.token")
        store.set("2023-1234", for: "session.username")
        #expect(SessionStore(client: client, secureStore: store).isSignedIn)
    }

    @Test func silentlyReauthenticatesOnceOnExpiredSession() async throws {
        store.set("old-token", for: "session.token")
        store.set("2023-1234", for: "session.username")
        store.set("pw", for: "session.password")
        StubURLProtocol.reset([
            Fixtures.failure(401, code: "SESSION_EXPIRED"),
            Fixtures.login,
            Fixtures.success(#"{"updated":1}"#),
        ])
        let session = SessionStore(client: client, secureStore: store)

        let result = try await session.send(Endpoints.markGradeOpened(code: "A"))

        #expect(result.updated == 1)
        #expect(store.string(for: "session.token") == "fresh-token")
        let auth = StubURLProtocol.recordedRequests().map { $0.value(forHTTPHeaderField: "Authorization") }
        #expect(auth == ["Bearer old-token", nil, "Bearer fresh-token"])
    }

    @Test func signsOutWhenReauthenticationIsImpossible() async {
        store.set("old-token", for: "session.token")
        store.set("2023-1234", for: "session.username")
        StubURLProtocol.reset([Fixtures.failure(401, code: "SESSION_EXPIRED")])
        let session = SessionStore(client: client, secureStore: store)

        await #expect(throws: APIError.sessionExpired) { try await session.send(Endpoints.absences()) }
        #expect(session.state == .signedOut)
        #expect(store.string(for: "session.token") == nil)
    }

    @Test func doesNotRetryNonAuthErrors() async {
        store.set("t", for: "session.token")
        store.set("2023-1234", for: "session.username")
        store.set("pw", for: "session.password")
        StubURLProtocol.reset([Fixtures.failure(502, code: "LISE_UNAVAILABLE")])
        let session = SessionStore(client: client, secureStore: store)

        await #expect(throws: APIError.server(code: "LISE_UNAVAILABLE", message: "msg")) {
            try await session.send(Endpoints.absences())
        }
        #expect(session.isSignedIn)
        #expect(StubURLProtocol.recordedRequests().count == 1)
    }

    @Test func signOutClearsCredentialsEvenIfLogoutFails() async {
        store.set("t", for: "session.token")
        store.set("2023-1234", for: "session.username")
        store.set("pw", for: "session.password")
        StubURLProtocol.reset([])
        let session = SessionStore(client: client, secureStore: store)

        await session.signOut()

        #expect(session.state == .signedOut)
        #expect(store.string(for: "session.password") == nil)
    }

    @Test func deleteAccountCallsTheAPIThenSignsOut() async throws {
        store.set("t", for: "session.token")
        store.set("2023-1234", for: "session.username")
        store.set("pw", for: "session.password")
        StubURLProtocol.reset([Fixtures.success(#"{"deleted":true}"#)])
        let session = SessionStore(client: client, secureStore: store)

        try await session.deleteAccount()

        let request = try #require(StubURLProtocol.recordedRequests().last)
        #expect(request.httpMethod == "DELETE")
        #expect(request.url?.path.hasSuffix("/api/v1/me") == true)
        #expect(session.state == .signedOut)
        #expect(store.string(for: "session.token") == nil)
        #expect(store.string(for: "session.password") == nil)
    }

    @Test func failedDeletionKeepsTheSession() async {
        store.set("t", for: "session.token")
        store.set("2023-1234", for: "session.username")
        StubURLProtocol.reset([Fixtures.failure(500, code: "INTERNAL")])
        let session = SessionStore(client: client, secureStore: store)

        await #expect(throws: APIError.self) { try await session.deleteAccount() }

        #expect(session.state == .signedIn(username: "2023-1234"))
        #expect(store.string(for: "session.token") == "t")
    }
}
