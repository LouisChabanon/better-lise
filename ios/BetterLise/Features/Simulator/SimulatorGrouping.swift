import Foundation

/// A hypothetical grade added by the user.
struct SimulatedGrade: Codable, Hashable, Identifiable, Sendable {
    var id = UUID().uuidString
    let name: String
    var grade: Double
    let coeff: Double
    let classCode: String
}

/// What the user changed in the simulator, persisted on the device.
struct SimulatorData: Codable, Equatable, Sendable {
    var simulations: [SimulatedGrade] = []
    /// Coefficients typed by the user, by grade code. They win over community ones.
    var localCoeffs: [String: Double] = [:]
    /// UE chosen by the user for grades whose code doesn't parse, by grade code.
    var classOverrides: [String: String] = [:]
}

struct SimulatorRealGrade: Identifiable, Equatable, Sendable {
    let grade: Grade
    /// Community coefficient, or 1 without votes.
    let baseCoeff: Double
    let isCommunity: Bool
    let effectiveCoeff: Double

    var id: String { grade.code }
    /// The user's coefficient differs from the shared one: it can be shared.
    var canShare: Bool { effectiveCoeff != baseCoeff }
}

struct UEGroup: Identifiable, Equatable, Sendable {
    let classCode: String
    let semester: String
    let real: [SimulatorRealGrade]
    let simulations: [SimulatedGrade]

    var id: String { classCode }

    var currentAverage: Double {
        SimulatorGrouping.mean(real.map { ($0.grade.note, $0.effectiveCoeff) })
    }

    var projectedAverage: Double {
        SimulatorGrouping.mean(real.map { ($0.grade.note, $0.effectiveCoeff) } + simulations.map { ($0.grade, $0.coeff) })
    }

    var hasSimulations: Bool { !simulations.isEmpty }
}

/// Grade simulator rules, ported from the web (hooks/useGradeSimulation.ts).
enum SimulatorGrouping {
    static let allSemesters = "all"
    static let simulatedSemester = "Sim"

    /// Semesters found in the grade codes, most recent first.
    static func availableSemesters(_ grades: [Grade]) -> [String] {
        let semesters = Set(grades.map { ClassCodeParser.parse($0.code).semester })
            .subtracting([ClassCodeParser.unassigned])
        return semesters.sorted { ClassCodeParser.semesterNumber($0) > ClassCodeParser.semesterNumber($1) }
    }

    static func groups(
        grades: [Grade],
        weights: [String: Double],
        data: SimulatorData,
        semester: String
    ) -> [UEGroup] {
        var semesters: [String: String] = [:]
        var real: [String: [SimulatorRealGrade]] = [:]
        var simulations: [String: [SimulatedGrade]] = [:]
        var order: [String] = []

        func register(_ classCode: String, semester: String, isReal: Bool) {
            if semesters[classCode] == nil {
                semesters[classCode] = semester
                order.append(classCode)
            } else if isReal, semesters[classCode] == ClassCodeParser.unassigned, semester != ClassCodeParser.unassigned {
                semesters[classCode] = semester
            }
        }

        for grade in grades {
            let parsed = ClassCodeParser.parse(grade.code)
            guard semester == allSemesters || parsed.semester == semester || parsed.semester == ClassCodeParser.unassigned else {
                continue
            }
            let classCode = data.classOverrides[grade.code] ?? parsed.classCode
            register(classCode, semester: parsed.semester, isReal: true)
            let community = weights[grade.code]
            let baseCoeff = community ?? 1
            real[classCode, default: []].append(SimulatorRealGrade(
                grade: grade,
                baseCoeff: baseCoeff,
                isCommunity: community != nil,
                effectiveCoeff: data.localCoeffs[grade.code] ?? baseCoeff
            ))
        }

        for simulation in data.simulations {
            let classCode = simulation.classCode.isEmpty ? ClassCodeParser.unassigned : simulation.classCode
            register(classCode, semester: simulatedSemester, isReal: false)
            simulations[classCode, default: []].append(simulation)
        }

        return order.sorted().map {
            UEGroup(classCode: $0, semester: semesters[$0] ?? ClassCodeParser.unassigned, real: real[$0] ?? [], simulations: simulations[$0] ?? [])
        }
    }

    /// Weighted mean, 0 when coefficients sum to 0.
    static func mean(_ items: [(grade: Double, coeff: Double)]) -> Double {
        let totalCoeff = items.reduce(0) { $0 + $1.coeff }
        guard totalCoeff != 0 else { return 0 }
        return items.reduce(0) { $0 + $1.grade * $1.coeff } / totalCoeff
    }
}
