import Foundation

/// Progress figures for the achievements header.
struct AchievementSummary: Equatable, Sendable {
    let total: Int
    let unlocked: Int
    let legendary: Int
    let rare: Int
    let secrets: Int
    let secretsFound: Int

    init(_ achievements: [Achievement]) {
        let unlockedItems = achievements.filter(\.isUnlocked)
        total = achievements.count
        unlocked = unlockedItems.count
        legendary = unlockedItems.filter { $0.rarity == .legendary }.count
        rare = unlockedItems.filter { $0.rarity == .rare }.count
        secrets = achievements.filter(\.isSecret).count
        secretsFound = unlockedItems.filter(\.isSecret).count
    }

    /// Between 0 and 1.
    var progress: Double { total == 0 ? 0 : Double(unlocked) / Double(total) }
}

/// Decides which unlocks deserve a celebration, from the codes already celebrated on this device.
enum AchievementCelebration {
    /// First launch for an account: everything already unlocked counts as seen, except what this sync unlocked.
    static func initialSeen(achievements: [Achievement], newlyUnlocked: [String]) -> Set<String> {
        Set(achievements.filter(\.isUnlocked).map(\.code)).subtracting(newlyUnlocked)
    }

    /// Unlocked achievements not celebrated yet, in list order.
    static func pending(achievements: [Achievement], seen: Set<String>) -> [Achievement] {
        achievements.filter { $0.isUnlocked && !seen.contains($0.code) }
    }

    /// Reveal mode hides new grades: celebrating a 20/20 before its reveal would spoil it.
    static func shouldDefer(revealMode: Bool, unreadGrades: Int) -> Bool {
        revealMode && unreadGrades > 0
    }
}

/// SF Symbol for the icon keys sent by the API.
enum AchievementSymbol {
    static func name(for icon: String?) -> String {
        switch icon {
        case "rocket": "sparkles"
        case "trophy": "trophy.fill"
        case "fall": "chart.line.downtrend.xyaxis"
        case "reload": "arrow.counterclockwise"
        case "fire": "flame.fill"
        case "aim": "scope"
        case "heart": "heart.fill"
        case "experiment": "testtube.2"
        case "flag": "flag.fill"
        default: "star.fill"
        }
    }
}
