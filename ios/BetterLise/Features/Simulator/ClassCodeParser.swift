import Foundation

/// UE and semester of a Lise grade code, ported from the web simulator (lib/utils/simulation-utils.ts).
struct ParsedClassCode: Equatable, Sendable {
    let semester: String
    let classCode: String
}

enum ClassCodeParser {
    static let unassigned = "Autre"
    /// Program segments that sit where the UE usually is: the UE follows them.
    private static let programSegments: Set<String> = ["GIE2", "GIE1", "GIM2", "GIM1", "EXP"]

    /// Codes look like `FITE_[semester]_[UE]_…`, sometimes with a program (and an `ED…` group) before the UE.
    static func parse(_ code: String) -> ParsedClassCode {
        let parts = code.split(separator: "_", omittingEmptySubsequences: false).map(String.init)
        guard parts.count >= 3 else { return .init(semester: unassigned, classCode: unassigned) }

        let semester = parts[1]
        guard programSegments.contains(parts[2]) else {
            return .init(semester: semester, classCode: parts[2])
        }
        guard let next = parts[safe: 3], !next.isEmpty else {
            return .init(semester: unassigned, classCode: unassigned)
        }
        guard next.hasPrefix("ED") else { return .init(semester: semester, classCode: next) }
        return .init(semester: semester, classCode: parts[safe: 4] ?? unassigned)
    }

    /// `S7` → 7, 0 when the semester has no number.
    static func semesterNumber(_ semester: String) -> Int {
        guard let match = semester.firstMatch(of: /[Ss](\d+)/) else { return 0 }
        return Int(match.1) ?? 0
    }
}

extension Array {
    subscript(safe index: Int) -> Element? {
        indices.contains(index) ? self[index] : nil
    }
}
