import Foundation
import Testing
@testable import BetterLise

struct GradeSortingTests {
    private func grade(_ code: String, _ date: String, note: Double = 12, isNew: Bool? = false) -> Grade {
        Grade(date: date, code: code, libelle: code, note: note, absence: "", comment: "", teachers: "", isNew: isNew)
    }

    @Test func unreadFirstThenMostRecent() {
        let sorted = GradeSorting.sorted([
            grade("old", "01/01/2024"),
            grade("recent", "15/03/2025"),
            grade("new", "01/09/2023", isNew: true),
            grade("unknown", "n/a", isNew: nil),
        ])
        #expect(sorted.map(\.code) == ["new", "recent", "old", "unknown"])
    }

    @Test func parsesLiseDates() {
        let date = DateParsing.liseDay("05/02/2025")
        #expect(date.map { Calendar.paris.dateComponents([.day, .month, .year], from: $0) }
            == DateComponents(year: 2025, month: 2, day: 5))
        #expect(DateParsing.liseDay("2025-02-05") == nil)
    }

    @Test(arguments: [(9.99, GradeSorting.Tier.failing), (10, .passing), (11.5, .passing), (12, .good), (20, .good)])
    func tiers(note: Double, tier: GradeSorting.Tier) {
        #expect(GradeSorting.tier(for: note) == tier)
    }

    @Test func distributionBins() {
        #expect(GradeSorting.binIndex(for: 0) == 0)
        #expect(GradeSorting.binIndex(for: 13.5) == 6)
        #expect(GradeSorting.binIndex(for: 20) == 9)
        #expect(GradeSorting.binIndex(for: -1) == 0)
    }
}
