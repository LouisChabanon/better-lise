import Foundation
import Testing
@testable import BetterLise

@MainActor
@Suite(.serialized)
struct SimulatorViewModelTests {
    private let gradesJSON = #"{"grades":[{"date":"02/02/2025","code":"FITE_S7_MATA_DS","libelle":"DS Matériaux","note":12,"absence":"","comment":"","teachers":"","isNew":false},{"date":"01/02/2025","code":"FITE_S6_MECA_DS","libelle":"DS Méca","note":9,"absence":"","comment":"","teachers":"","isNew":false}]}"#

    private func makeModels(defaults: UserDefaults) -> (GradesViewModel, SimulatorViewModel) {
        let store = InMemorySecureStore()
        store.set("token", for: "session.token")
        store.set("2023-1234", for: "session.username")
        let client = APIClient(baseURL: URL(string: "http://localhost:3000")!, session: StubURLProtocol.makeSession())
        let session = SessionStore(client: client, secureStore: store)
        let cache = ResponseCache(directory: FileManager.default.temporaryDirectory.appending(path: UUID().uuidString))
        let grades = GradesViewModel(session: session, cache: cache, health: LiseHealthMonitor(session: session))
        let simulator = SimulatorViewModel(grades: grades, session: session, cache: cache, store: SimulatorStore(defaults: defaults))
        return (grades, simulator)
    }

    @Test func defaultsToTheLatestSemesterAndUsesCommunityWeights() async throws {
        let suite = "tests.\(UUID().uuidString)"
        let defaults = try #require(UserDefaults(suiteName: suite))
        defer { defaults.removePersistentDomain(forName: suite) }
        StubURLProtocol.reset([
            Fixtures.success(gradesJSON, path: "/grades"),
            Fixtures.success(#"{"weights":{"FITE_S7_MATA_DS":2}}"#, path: "/grades/weights"),
        ])
        let (grades, simulator) = makeModels(defaults: defaults)
        await grades.load()
        await simulator.loadWeights()

        #expect(simulator.semester == "S7")
        #expect(simulator.groups.map(\.classCode) == ["MATA"])
        #expect(simulator.groups.first?.real.first?.isCommunity == true)
        #expect(simulator.availableClasses == ["MATA", "Autre"])
    }

    @Test func persistsSimulationsPerAccount() async throws {
        let suite = "tests.\(UUID().uuidString)"
        let defaults = try #require(UserDefaults(suiteName: suite))
        defer { defaults.removePersistentDomain(forName: suite) }
        StubURLProtocol.reset([])
        let (_, simulator) = makeModels(defaults: defaults)
        simulator.activate(username: "2023-1234")
        simulator.addSimulation(name: "  ", grade: 25, coeff: 1.33, classCode: "MATA")
        simulator.addSimulation(name: "Invalide", grade: 12, coeff: 0, classCode: "MATA")
        simulator.setLocalCoeff(code: "FITE_S7_MATA_DS", to: 0)
        simulator.setLocalCoeff(code: "FITE_S7_MATA_DS", to: 4)

        let simulation = try #require(simulator.data.simulations.first)
        #expect(simulation.name == "Simu.")
        #expect(simulation.grade == 20)
        #expect(simulation.coeff == 1.33)
        #expect(simulator.data.simulations.count == 1)
        #expect(simulator.data.localCoeffs == ["FITE_S7_MATA_DS": 4])

        let (_, reloaded) = makeModels(defaults: defaults)
        reloaded.activate(username: "2023-1234")
        #expect(reloaded.data == simulator.data)
        reloaded.activate(username: "2024-0001")
        #expect(reloaded.data == SimulatorData())

        reloaded.reset()
        let (_, afterReset) = makeModels(defaults: defaults)
        afterReset.activate(username: "2023-1234")
        #expect(afterReset.data == SimulatorData())
    }

    @Test func sharingACoefficientMakesItTheCommunityValue() async throws {
        let suite = "tests.\(UUID().uuidString)"
        let defaults = try #require(UserDefaults(suiteName: suite))
        defer { defaults.removePersistentDomain(forName: suite) }
        StubURLProtocol.reset([
            Fixtures.success(gradesJSON, path: "/grades"),
            Fixtures.success(#"{"code":"FITE_S7_MATA_DS","weight":3}"#, path: "/weight"),
        ])
        let (grades, simulator) = makeModels(defaults: defaults)
        await grades.load()
        simulator.activate(username: "2023-1234")
        simulator.setLocalCoeff(code: "FITE_S7_MATA_DS", to: 3)
        let row = try #require(simulator.groups.first?.real.first)

        await simulator.shareCoeff(row)

        #expect(simulator.weights["FITE_S7_MATA_DS"] == 3)
        #expect(simulator.data.localCoeffs.isEmpty)
        #expect(simulator.groups.first?.real.first?.canShare == false)
        let request = try #require(StubURLProtocol.recordedRequests().last)
        #expect(request.httpMethod == "PUT")
        #expect(request.url?.path == "/api/v1/grades/FITE_S7_MATA_DS/weight")
    }

    @Test func failedShareKeepsTheLocalCoefficient() async throws {
        let suite = "tests.\(UUID().uuidString)"
        let defaults = try #require(UserDefaults(suiteName: suite))
        defer { defaults.removePersistentDomain(forName: suite) }
        StubURLProtocol.reset([
            Fixtures.success(gradesJSON, path: "/grades"),
            Fixtures.failure(500, code: "INTERNAL", path: "/weight"),
        ])
        let (grades, simulator) = makeModels(defaults: defaults)
        await grades.load()
        simulator.activate(username: "2023-1234")
        simulator.setLocalCoeff(code: "FITE_S7_MATA_DS", to: 3)

        await simulator.shareCoeff(try #require(simulator.groups.first?.real.first))

        #expect(simulator.data.localCoeffs == ["FITE_S7_MATA_DS": 3])
        #expect(simulator.errorMessage != nil)
        #expect(simulator.sharingCodes.isEmpty)
    }
}
