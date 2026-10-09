import Foundation
import Testing
@testable import BetterLise

struct SlotMachineLogicTests {
    @Test(arguments: [
        (18.5, [1, 8, 5, 0]), (7.25, [0, 7, 2, 5]), (20.0, [2, 0, 0, 0]), (0.0, [0, 0, 0, 0]),
        (12.345, [1, 2, 3, 5]), (25.0, [2, 0, 0, 0]), (-3.0, [0, 0, 0, 0]), (Double.nan, [0, 0, 0, 0]),
    ])
    func digitsMatchTheWebFormatting(grade: Double, digits: [Int]) {
        #expect(SlotReveal.digits(of: grade) == digits)
    }

    @Test func leastSignificantReelStopsFirstAndEachLaterReelSpinsLonger() {
        let reels = SlotReveal.reels(for: 14.75, reduceMotion: false)
        #expect(reels.map(\.stopOrder) == [3, 2, 1, 0])
        #expect(reels.map(\.duration) == [5.8, 3.8, 2.3, 1.2])
        #expect(reels.map(\.loops) == [8, 8, 8, 6])
    }

    @Test func reducedMotionLandsQuicklyWithoutLooping() {
        let reels = SlotReveal.reels(for: 14.75, reduceMotion: true)
        #expect(reels.allSatisfy { $0.duration == SlotReveal.reducedMotionDuration && $0.loops == 0 })
        #expect(reels.map(\.target) == [1, 4, 7, 5])
    }

    @Test func stripLoopsThroughEveryDigitAndTargetsTheGradeDigit() {
        let strip = SlotReveal.strip(loops: 2)
        #expect(strip.count == 30)
        #expect(strip[0] == 0 && strip[9] == 9 && strip[10] == 0)
        let target = SlotReveal.targetIndex(loops: 2, digit: 7)
        #expect(target == 27)
        #expect(strip[target] == 7)
    }

    @Test func positionOvershootsThenSettlesOnTheTarget() {
        let easing = CubicBezier(0.15, 0.55, 0.2, 1)
        let position = { (t: Double) in SlotReveal.position(elapsed: t, target: 20, duration: 1, easing: easing) }
        #expect(position(0) == 0)
        #expect(position(-1) == 0)
        #expect(abs(position(SlotReveal.settleAt) - (20 + SlotReveal.overshoot)) < 1e-6)
        #expect(position(0.97) > 20 && position(0.97) < 20 + SlotReveal.overshoot)
        #expect(position(1) == 20)
        #expect(position(10) == 20)
        // Monotonic while spinning
        let samples = stride(from: 0.0, through: SlotReveal.settleAt, by: 0.01).map(position)
        #expect(zip(samples, samples.dropFirst()).allSatisfy { $0 <= $1 })
    }

    @Test func reelsStopOneByOne() {
        let reels = SlotReveal.reels(for: 9.99, reduceMotion: false)
        #expect(SlotReveal.stoppedCount(reels, at: 0) == 0)
        #expect(SlotReveal.stoppedCount(reels, at: 1.2) == 1)
        #expect(SlotReveal.stoppedCount(reels, at: 3) == 2)
        #expect(SlotReveal.stoppedCount(reels, at: 4) == 3)
        #expect(SlotReveal.stoppedCount(reels, at: 5.8) == 4)
        #expect(reels.allSatisfy { $0.position(at: 6) == Double($0.target) })
    }

    @Test func onlyTheNextReelToStopDrivesTicks() {
        let reels = SlotReveal.reels(for: 9.99, reduceMotion: false)
        // After the hundredths reel stopped, the tenths reel is the one ticking
        let tenths = reels[2]
        let elapsed = 1.5
        #expect(SlotReveal.tickKey(reels, at: elapsed) == 1_000 + Int(tenths.position(at: elapsed).rounded()))
        // Once every reel stopped the key no longer moves
        #expect(SlotReveal.tickKey(reels, at: 6) == SlotReveal.tickKey(reels, at: 60))
    }

    @Test func onlyTheLeadingZeroIsDimmed() {
        let reels = SlotReveal.reels(for: 7.05, reduceMotion: false)
        #expect(reels.map(SlotReveal.isDimmed) == [true, false, false, false])
        #expect(!SlotReveal.reels(for: 17.05, reduceMotion: false).contains(where: SlotReveal.isDimmed))
    }
}
