import Testing
@testable import BetterLise

struct SimulatorGroupingTests {
    private func grade(_ code: String, _ note: Double) -> Grade {
        Grade(date: "01/01/2025", code: code, libelle: code, note: note, absence: "", comment: "", teachers: "", isNew: false)
    }

    private var grades: [Grade] {
        [
            grade("FITE_S7_MATA_DS", 12),
            grade("FITE_S7_MATA_TP", 18),
            grade("FITE_S8_REPA_TP", 15),
            grade("MYSTERY", 8),
        ]
    }

    @Test func listsSemestersMostRecentFirst() {
        #expect(SimulatorGrouping.availableSemesters(grades + [grade("FITE_S10_X_Y", 1)]) == ["S10", "S8", "S7"])
    }

    @Test func filtersBySemesterButKeepsUnassignedGrades() {
        let groups = SimulatorGrouping.groups(grades: grades, weights: [:], data: SimulatorData(), semester: "S7")
        #expect(groups.map(\.classCode) == ["Autre", "MATA"])
        #expect(groups[1].semester == "S7")

        let all = SimulatorGrouping.groups(grades: grades, weights: [:], data: SimulatorData(), semester: SimulatorGrouping.allSemesters)
        #expect(all.map(\.classCode) == ["Autre", "MATA", "REPA"])
    }

    @Test func coefficientsPreferLocalThenCommunityThenOne() throws {
        let data = SimulatorData(localCoeffs: ["FITE_S7_MATA_TP": 3])
        let weights = ["FITE_S7_MATA_DS": 2.0, "FITE_S7_MATA_TP": 1.0]
        let mata = try #require(SimulatorGrouping.groups(grades: grades, weights: weights, data: data, semester: "S7").first { $0.classCode == "MATA" })

        let ds = try #require(mata.real.first { $0.id == "FITE_S7_MATA_DS" })
        #expect(ds.effectiveCoeff == 2 && ds.isCommunity && !ds.canShare)
        let tp = try #require(mata.real.first { $0.id == "FITE_S7_MATA_TP" })
        #expect(tp.effectiveCoeff == 3 && tp.canShare)
        let expected: Double = (12 * 2 + 18 * 3) / 5
        #expect(mata.currentAverage == expected)
    }

    @Test func projectsSimulationsAndOverridesClasses() throws {
        let data = SimulatorData(
            simulations: [
                SimulatedGrade(name: "Rattrapage", grade: 20, coeff: 2, classCode: "MATA"),
                SimulatedGrade(name: "Projet", grade: 10, coeff: 1, classCode: "NEW"),
            ],
            classOverrides: ["MYSTERY": "MATA"]
        )
        let groups = SimulatorGrouping.groups(grades: grades, weights: [:], data: data, semester: "S7")
        #expect(groups.map(\.classCode) == ["MATA", "NEW"])

        let mata = try #require(groups.first)
        #expect(mata.real.count == 3)
        #expect(mata.semester == "S7")
        let current: Double = (12 + 18 + 8) / 3
        #expect(abs(mata.currentAverage - current) < 1e-9)
        let projected: Double = (12 + 18 + 8 + 40) / 5
        #expect(abs(mata.projectedAverage - projected) < 1e-9)
        #expect(groups[1].semester == SimulatorGrouping.simulatedSemester)
        #expect(groups[1].currentAverage == 0)
    }

    @Test func meanIsZeroWithoutCoefficients() {
        #expect(SimulatorGrouping.mean([]) == 0)
        #expect(SimulatorGrouping.mean([(grade: 10, coeff: 0)]) == 0)
    }
}
