import Foundation
import Testing
@testable import BetterLise

@Suite(.serialized)
struct APIClientTests {
    let client = APIClient(baseURL: URL(string: "http://localhost:3000")!, session: StubURLProtocol.makeSession())

    @Test func decodesEnvelopeAndDates() async throws {
        StubURLProtocol.reset([
            Fixtures.success(#"{"events":[{"title":"MATA","startDate":"2025-03-10T07:00:00.000Z","endDate":"2025-03-10T09:00:00Z","room":"A1","type":"CM","isAllDay":false}]}"#),
        ])

        let response = try await client.send(Endpoints.agenda(liseId: "2023-1234", tbk: "Cluny", includeRU: true), token: nil)

        #expect(response.events.count == 1)
        #expect(response.events[0].kind == .lecture)
        #expect(response.events[0].startDate == DateParsing.iso8601("2025-03-10T07:00:00Z"))
        let url = try #require(StubURLProtocol.recordedRequests().first?.url)
        #expect(url.absoluteString == "http://localhost:3000/api/v1/agenda?liseId=2023-1234&tbk=Cluny&ru=true")
    }

    @Test func attachesBearerOnlyToAuthenticatedEndpoints() throws {
        let authed = try client.makeRequest(Endpoints.grades(refresh: false), token: "abc")
        #expect(authed.value(forHTTPHeaderField: "Authorization") == "Bearer abc")

        let publicRequest = try client.makeRequest(Endpoints.agenda(liseId: "x", tbk: "y", includeRU: false), token: "abc")
        #expect(publicRequest.value(forHTTPHeaderField: "Authorization") == nil)
    }

    @Test func encodesLoginBodyAndGradeCodes() throws {
        let login = try client.makeRequest(Endpoints.login(username: "2023-1234", password: "p@ss"), token: nil)
        let body = try JSONSerialization.jsonObject(with: #require(login.httpBody)) as? [String: String]
        #expect(body == ["username": "2023-1234", "password": "p@ss"])
        #expect(login.httpMethod == "POST")

        let stats = try client.makeRequest(Endpoints.gradeStats(code: "FITE S7/MATA"), token: "t")
        #expect(stats.url?.absoluteString == "http://localhost:3000/api/v1/grades/FITE%20S7%2FMATA/stats")
    }

    @Test func mapsAPIErrors() async {
        StubURLProtocol.reset([
            Fixtures.failure(401, code: "SESSION_EXPIRED"),
            Fixtures.failure(429, code: "RATE_LIMITED", message: "Trop de tentatives"),
            Fixtures.failure(502, code: "LISE_UNAVAILABLE"),
            .init(status: 500, body: "<html>oops</html>"),
            .init(status: 200, body: "not json"),
        ])

        await #expect(throws: APIError.sessionExpired) { try await client.send(Endpoints.absences(), token: "t") }
        await #expect(throws: APIError.rateLimited("Trop de tentatives")) { try await client.send(Endpoints.absences(), token: "t") }
        await #expect(throws: APIError.server(code: "LISE_UNAVAILABLE", message: "msg")) { try await client.send(Endpoints.absences(), token: "t") }
        await #expect(throws: APIError.server(code: "HTTP_500", message: "")) { try await client.send(Endpoints.absences(), token: "t") }
        await #expect(throws: APIError.decoding) { try await client.send(Endpoints.absences(), token: "t") }
    }

    @Test func mapsTransportFailures() async {
        StubURLProtocol.reset([])
        await #expect {
            try await client.send(Endpoints.absences(), token: "t")
        } throws: { error in
            if case .network = error as? APIError { return true }
            return false
        }
    }

    @Test func decodesProfileClassKey() throws {
        let json = Data(#"{"username":"2023-1234","class":"GIM2","tbk":null,"currentStreak":3}"#.utf8)
        let profile = try APIClient.decoder.decode(Profile.self, from: json)
        #expect(profile.promo == "GIM2")
        #expect(profile.tbk == nil)
    }
}
