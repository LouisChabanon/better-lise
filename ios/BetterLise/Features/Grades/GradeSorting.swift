import Foundation

enum GradeSorting {
    /// Unread grades first, then most recent Lise date first.
    static func sorted(_ grades: [Grade]) -> [Grade] {
        grades.sorted { lhs, rhs in
            if lhs.isUnread != rhs.isUnread { return lhs.isUnread }
            let lhsDate = DateParsing.liseDay(lhs.date) ?? .distantPast
            let rhsDate = DateParsing.liseDay(rhs.date) ?? .distantPast
            return lhsDate > rhsDate
        }
    }

    enum Tier: Equatable {
        case failing, passing, good
    }

    static func tier(for note: Double) -> Tier {
        switch note {
        case ..<10: .failing
        case ..<12: .passing
        default: .good
        }
    }

    /// Index of the distribution bin (2-point bins, 20 counted in the last one).
    static func binIndex(for note: Double, binCount: Int = 10) -> Int {
        min(max(Int(note / 2), 0), binCount - 1)
    }
}
