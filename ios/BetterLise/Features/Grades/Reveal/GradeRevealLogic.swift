import SwiftUI

/// Grade tiers of the web reveal (lib/utils/game-utils.ts `getRarity`). Internal only: picks the reveal color.
enum GradeRarity: CaseIterable, Equatable, Sendable {
    case poor, basic, common, epic, legendary

    init(grade: Double) {
        switch grade {
        case 18...: self = .legendary
        case 14...: self = .epic
        case 10...: self = .common
        case 7...: self = .basic
        default: self = .poor
        }
    }

    /// Same Tailwind v4 tokens as the web (amber-400, fuchsia-700, blue-600, orange-700, red-700).
    var hex: UInt32 {
        switch self {
        case .legendary: 0xFFB900
        case .epic: 0xA800B7
        case .common: 0x155DFC
        case .basic: 0xCA3500
        case .poor: 0xC10007
        }
    }

    var color: Color { Color(uiColor: UIColor(hex: hex)) }
}

struct RevealItem: Identifiable, Equatable, Sendable {
    let id: Int
    let grade: Double
    /// Formatted once: formatting 50 labels every frame was a visible cost while rolling.
    let label: String

    init(id: Int, grade: Double) {
        self.id = id
        self.grade = grade
        label = grade.formatted(.number.precision(.fractionLength(2)).locale(Locale(identifier: "fr_FR")))
    }

    var rarity: GradeRarity { GradeRarity(grade: grade) }
}

/// Limits how often tick feedback fires. At full speed the reel crosses ~30 items per second, more than
/// the Taptic Engine or the ear can separate; the slow end still gets every tick.
struct TickThrottle: Sendable {
    let minimumInterval: TimeInterval
    private var lastFire: TimeInterval?

    init(minimumInterval: TimeInterval) {
        self.minimumInterval = minimumInterval
    }

    mutating func shouldFire(at time: TimeInterval) -> Bool {
        if let lastFire, time - lastFire < minimumInterval - 1e-9 { return false }
        lastFire = time
        return true
    }
}

/// Port of the web reel (components/LootCase.tsx).
enum GradeReveal {
    static let reelSize = 50
    static let targetIndex = 47
    static let itemWidth: CGFloat = 120
    static let confettiThreshold = 10.0
    static let revealHoldDuration: TimeInterval = 3
    /// `cubic-bezier(0, 0.65, 0.45, 1)`: fast start, long suspenseful deceleration.
    static let easing = CubicBezier(0, 0.65, 0.45, 1)

    /// The same curve for Core Animation, which runs the roll on the render server.
    static var timingFunction: CAMediaTimingFunction {
        CAMediaTimingFunction(controlPoints: Float(easing.x1), Float(easing.y1), Float(easing.x2), Float(easing.y2))
    }

    static var rollDuration: TimeInterval {
        #if DEBUG
        // UI tests shorten the roll with `-revealRollDuration <seconds>`
        let override = UserDefaults.standard.double(forKey: "revealRollDuration")
        if override > 0 { return override }
        #endif
        return 8
    }

    /// Random grades (uniform 0–20, "more fun" than a bell curve on the web) with the real grade hidden
    /// at the target index. `random` returns values in 0..<1.
    static func makeReel(target grade: Double, random: () -> Double = { Double.random(in: 0..<1) }) -> [RevealItem] {
        (0..<reelSize).map { index in
            let value = random() * 20
            return RevealItem(id: index, grade: index == targetIndex ? grade : value)
        }
    }

    /// Reel offset that centers the target item, shifted by up to ±20 % of an item (`jitterUnit` in 0..<1).
    static func stopOffset(containerWidth: CGFloat, itemWidth: CGFloat = itemWidth, jitterUnit: Double) -> CGFloat {
        let centerOffset = containerWidth / 2 - itemWidth / 2
        let jitter = (jitterUnit - 0.5) * itemWidth * 0.4
        return -(CGFloat(targetIndex) * itemWidth) + centerOffset + jitter
    }

    static func offset(elapsed: TimeInterval, stop: CGFloat, duration: TimeInterval) -> CGFloat {
        let progress = min(max(elapsed / duration, 0), 1)
        return stop * easing.value(at: progress)
    }

    /// Index of the item under the center marker; each change is a "tick".
    static func centeredIndex(offset: CGFloat, containerWidth: CGFloat, itemWidth: CGFloat = itemWidth) -> Int {
        Int(floor((containerWidth / 2 - offset) / itemWidth))
    }

    static func shouldCelebrate(_ grade: Double) -> Bool {
        grade >= confettiThreshold
    }
}

/// CSS-style cubic Bézier timing curve evaluated for a time fraction.
struct CubicBezier: Sendable {
    let x1, y1, x2, y2: Double

    init(_ x1: Double, _ y1: Double, _ x2: Double, _ y2: Double) {
        (self.x1, self.y1, self.x2, self.y2) = (x1, y1, x2, y2)
    }

    func value(at time: Double) -> Double {
        guard time > 0 else { return 0 }
        guard time < 1 else { return 1 }
        return component(solveParameter(for: time), y1, y2)
    }

    private func component(_ t: Double, _ p1: Double, _ p2: Double) -> Double {
        let u = 1 - t
        return 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t
    }

    /// x(t) is monotonic for valid CSS curves, so bisection converges reliably.
    private func solveParameter(for x: Double) -> Double {
        var low = 0.0, high = 1.0
        for _ in 0..<40 {
            let mid = (low + high) / 2
            if component(mid, x1, x2) < x { low = mid } else { high = mid }
        }
        return (low + high) / 2
    }
}
