import Foundation
import Observation

@MainActor
@Observable
final class SimulatorViewModel {
    private(set) var data = SimulatorData()
    private(set) var weights: [String: Double] = [:]
    private(set) var sharingCodes: Set<String> = []
    var errorMessage: String?
    /// nil follows the most recent semester.
    var selectedSemester: String?

    private let grades: GradesViewModel
    private let session: SessionStore
    private let cache: ResponseCache
    private let store: SimulatorStore
    private var username: String?
    private let weightsCacheKey = "communityWeights"

    init(grades: GradesViewModel, session: SessionStore, cache: ResponseCache, store: SimulatorStore = SimulatorStore()) {
        self.grades = grades
        self.session = session
        self.cache = cache
        self.store = store
    }

    private var allGrades: [Grade] { grades.state.value ?? [] }

    var availableSemesters: [String] { SimulatorGrouping.availableSemesters(allGrades) }

    var semester: String { selectedSemester ?? availableSemesters.first ?? SimulatorGrouping.allSemesters }

    var groups: [UEGroup] {
        SimulatorGrouping.groups(grades: allGrades, weights: weights, data: data, semester: semester)
    }

    /// UEs offered when adding a simulation.
    var availableClasses: [String] {
        let classes = groups.map(\.classCode).filter { $0 != ClassCodeParser.unassigned }
        return classes + [ClassCodeParser.unassigned]
    }

    /// Loads the account's saved simulations when the signed-in user changes.
    func activate(username: String?) {
        guard username != self.username else { return }
        self.username = username
        data = username.map(store.load(username:)) ?? SimulatorData()
        selectedSemester = nil
    }

    func loadWeights() async {
        if weights.isEmpty, let cached = cache.load([String: Double].self, key: weightsCacheKey) {
            weights = cached
        }
        do {
            let response = try await session.send(Endpoints.communityWeights())
            weights = response.weights
            cache.save(response.weights, key: weightsCacheKey)
            errorMessage = nil
        } catch {
            errorMessage = "Coefficients de la communauté indisponibles : \(error.localizedDescription)"
        }
    }

    func addSimulation(name: String, grade: Double, coeff: Double, classCode: String) {
        let trimmed = name.trimmingCharacters(in: .whitespaces)
        let simulation = SimulatedGrade(
            name: trimmed.isEmpty ? "Simu." : trimmed,
            grade: min(max(grade, 0), 20),
            coeff: max(coeff, 0.01),
            classCode: classCode
        )
        update { $0.simulations.append(simulation) }
    }

    func removeSimulation(id: String) {
        update { $0.simulations.removeAll { $0.id == id } }
    }

    func setSimulatedGrade(id: String, to value: Double) {
        update { data in
            guard let index = data.simulations.firstIndex(where: { $0.id == id }) else { return }
            data.simulations[index].grade = min(max(value, 0), 20)
        }
    }

    func setLocalCoeff(code: String, to value: Double) {
        guard value > 0, value.isFinite else { return }
        update { $0.localCoeffs[code] = value }
    }

    func assignClass(code: String, to classCode: String) {
        let trimmed = classCode.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty else { return }
        update { $0.classOverrides[code] = trimmed.uppercased() }
    }

    /// Shares the user's coefficient; on success it becomes the community value, as on the web.
    func shareCoeff(_ grade: SimulatorRealGrade) async {
        let code = grade.grade.code
        let weight = grade.effectiveCoeff
        sharingCodes.insert(code)
        defer { sharingCodes.remove(code) }
        do {
            let response = try await session.send(Endpoints.voteWeight(code: code, weight: weight))
            weights[code] = response.weight
            cache.save(weights, key: weightsCacheKey)
            update { $0.localCoeffs[code] = nil }
            errorMessage = nil
        } catch {
            errorMessage = "Partage du coefficient impossible : \(error.localizedDescription)"
        }
    }

    /// Forgets every account's simulations (sign-out and account deletion).
    func reset() {
        store.clearAll()
        data = SimulatorData()
        username = nil
        selectedSemester = nil
    }

    private func update(_ change: (inout SimulatorData) -> Void) {
        var next = data
        change(&next)
        data = next
        if let username { store.save(next, username: username) }
    }
}
