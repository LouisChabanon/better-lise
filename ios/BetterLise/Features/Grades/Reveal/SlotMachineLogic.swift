import Foundation

/// One reel of the slot machine: a 0–9 strip looping `loops` times before landing on `digit`.
struct SlotReel: Sendable {
    /// Left to right: tens, units, tenths, hundredths.
    let index: Int
    let digit: Int
    let loops: Int
    let duration: TimeInterval
    let easing: CubicBezier

    /// Strip index the reel lands on.
    var target: Int { SlotReveal.targetIndex(loops: loops, digit: digit) }
    var stopOrder: Int { SlotReveal.stopOrder(reel: index) }
    var strip: [Int] { SlotReveal.strip(loops: loops) }

    func isStopped(at elapsed: TimeInterval) -> Bool { elapsed >= duration }

    func position(at elapsed: TimeInterval) -> Double {
        SlotReveal.position(elapsed: elapsed, target: Double(target), duration: duration, easing: easing)
    }
}

/// Port of the web slot machine (lib/utils/slot-utils.ts + components/slot-machine). Digits roll and stop
/// one by one from the least significant, each more significant reel spinning slower and longer.
enum SlotReveal {
    static let reelCount = 4
    static let digitsPerLoop = 10
    /// The decimal separator sits after the units reel.
    static let decimalSeparatorAfter = 1
    /// Fraction of the run spent spinning; the rest settles back from the overshoot.
    static let settleAt = 0.93
    /// The reel slightly overshoots its digit then settles back, like a real reel catching (in digits).
    static let overshoot = 0.22
    static let reducedMotionDuration: TimeInterval = 0.3

    private static let maxGrade = 20.0
    // Indexed by stop order (hundredths first, tens last)
    private static let stopSeconds: [TimeInterval] = [1.2, 2.3, 3.8, 5.8]
    private static let loopsPerSecond = [5, 3.4, 2.1, 1.3]
    private static let spinEasings = [
        CubicBezier(0.15, 0.55, 0.2, 1),
        CubicBezier(0.12, 0.65, 0.15, 1),
        CubicBezier(0.1, 0.72, 0.1, 1),
        CubicBezier(0.08, 0.8, 0.05, 1),
    ]
    private static let settleEasing = CubicBezier(0.4, 0, 0.2, 1)

    /// `[tens, units, tenths, hundredths]` of the grade clamped to 0–20.
    static func digits(of grade: Double) -> [Int] {
        let safe = grade.isFinite ? min(maxGrade, max(0, grade)) : 0
        let hundredths = Int((safe * 100).rounded())
        return [hundredths / 1000, hundredths / 100 % 10, hundredths / 10 % 10, hundredths % 10]
    }

    /// Least significant digit stops first: hundredths → 0, tens → 3.
    static func stopOrder(reel: Int) -> Int { reelCount - 1 - reel }

    static func duration(reel: Int, reduceMotion: Bool) -> TimeInterval {
        reduceMotion ? reducedMotionDuration : stopSeconds[stopOrder(reel: reel)]
    }

    /// Number of full 0–9 loops the reel scrolls through before landing.
    static func loops(reel: Int, reduceMotion: Bool) -> Int {
        guard !reduceMotion else { return 0 }
        let order = stopOrder(reel: reel)
        return max(1, Int((stopSeconds[order] * loopsPerSecond[order]).rounded()))
    }

    static func strip(loops: Int) -> [Int] {
        (0..<(loops + 1) * digitsPerLoop).map { $0 % digitsPerLoop }
    }

    static func targetIndex(loops: Int, digit: Int) -> Int {
        loops * digitsPerLoop + digit
    }

    static func reels(for grade: Double, reduceMotion: Bool) -> [SlotReel] {
        digits(of: grade).enumerated().map { index, digit in
            SlotReel(
                index: index,
                digit: digit,
                loops: loops(reel: index, reduceMotion: reduceMotion),
                duration: duration(reel: index, reduceMotion: reduceMotion),
                easing: spinEasings[stopOrder(reel: index)]
            )
        }
    }

    /// Strip position in digits (0 = first digit in the window): eased spin past the target, then settle back.
    static func position(elapsed: TimeInterval, target: Double, duration: TimeInterval, easing: CubicBezier) -> Double {
        let progress = duration > 0 ? min(max(elapsed / duration, 0), 1) : 1
        guard progress < 1 else { return target }
        let peak = target + overshoot
        if progress < settleAt {
            return peak * easing.value(at: progress / settleAt)
        }
        return peak - overshoot * settleEasing.value(at: (progress - settleAt) / (1 - settleAt))
    }

    static func stoppedCount(_ reels: [SlotReel], at elapsed: TimeInterval) -> Int {
        reels.filter { $0.isStopped(at: elapsed) }.count
    }

    /// Changes each time the next reel to stop shows a new digit, or a reel stops: only that reel ticks,
    /// so the sound slows down as it lands.
    static func tickKey(_ reels: [SlotReel], at elapsed: TimeInterval) -> Int {
        let stopped = stoppedCount(reels, at: elapsed)
        guard let next = reels.first(where: { $0.stopOrder == stopped }) else { return -stopped }
        return stopped * 1_000 + Int(next.position(at: elapsed).rounded())
    }

    /// The leading zero of a grade under 10 is dimmed once landed.
    static func isDimmed(_ reel: SlotReel) -> Bool { reel.index == 0 && reel.digit == 0 }
}
