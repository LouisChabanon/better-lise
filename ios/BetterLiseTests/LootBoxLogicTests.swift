import Foundation
import Testing
@testable import BetterLise

struct LootBoxLogicTests {
    @Test(arguments: [
        (20.0, LootRarity.legendary), (18.0, .legendary), (17.99, .epic), (14.0, .epic),
        (13.5, .common), (10.0, .common), (9.99, .basic), (7.0, .basic), (6.99, .poor), (0.0, .poor),
    ])
    func rarityThresholdsMatchTheWeb(grade: Double, rarity: LootRarity) {
        #expect(LootRarity(grade: grade) == rarity)
    }

    @Test func rarityColorsAreTheWebTailwindTokens() {
        #expect(LootRarity.legendary.hex == 0xFFB900)
        #expect(LootRarity.epic.hex == 0xA800B7)
        #expect(LootRarity.common.hex == 0x155DFC)
        #expect(LootRarity.basic.hex == 0xCA3500)
        #expect(LootRarity.poor.hex == 0xC10007)
    }

    @Test func reelHidesTheRealGradeAtTheWinningIndex() {
        var values = [0.0, 0.5, 0.999].makeIterator()
        var generated = 0
        let reel = LootBox.makeReel(winning: 16.25) {
            generated += 1
            return values.next() ?? 0.25
        }

        #expect(reel.count == LootBox.reelSize)
        #expect(reel[LootBox.winningIndex].grade == 16.25)
        #expect(reel[0].grade == 0)
        #expect(reel[1].grade == 10)
        #expect(abs(reel[2].grade - 19.98) < 0.001)
        #expect(reel.allSatisfy { (0...20).contains($0.grade) })
        #expect(Set(reel.map(\.id)).count == LootBox.reelSize)
    }

    @Test func stopOffsetCentersTheWinningItemWithBoundedJitter() {
        let width: CGFloat = 400
        let centered = LootBox.stopOffset(containerWidth: width, jitterUnit: 0.5)
        #expect(abs(centered - (-(47 * 120) + (200 - 60))) < 0.001)
        #expect(LootBox.centeredIndex(offset: centered, containerWidth: width) == LootBox.winningIndex)

        for unit in [0.0, 0.25, 0.75, 0.9999] {
            let offset = LootBox.stopOffset(containerWidth: width, jitterUnit: unit)
            #expect(abs(offset - centered) <= 24)
            #expect(LootBox.centeredIndex(offset: offset, containerWidth: width) == LootBox.winningIndex)
        }
    }

    @Test func easingMatchesTheWebCurve() {
        let curve = LootBox.easing
        #expect(curve.value(at: 0) == 0)
        #expect(curve.value(at: 1) == 1)
        let samples = stride(from: 0.0, through: 1, by: 0.01).map(curve.value(at:))
        #expect(zip(samples, samples.dropFirst()).allSatisfy { $0 <= $1 + 1e-9 })
        // Fast start, long deceleration: most of the distance is covered early
        #expect(curve.value(at: 0.25) > 0.5)
        #expect(curve.value(at: 0.9) > 0.97)
    }

    @Test func reelOffsetTravelsFromZeroToTheStop() {
        #expect(LootBox.offset(elapsed: 0, stop: -5000, duration: 8) == 0)
        #expect(LootBox.offset(elapsed: -1, stop: -5000, duration: 8) == 0)
        #expect(LootBox.offset(elapsed: 8, stop: -5000, duration: 8) == -5000)
        #expect(LootBox.offset(elapsed: 30, stop: -5000, duration: 8) == -5000)
        let mid = LootBox.offset(elapsed: 4, stop: -5000, duration: 8)
        #expect(mid < -2500 && mid > -5000)
    }

    @Test func centeredIndexAdvancesAsTheReelScrolls() {
        #expect(LootBox.centeredIndex(offset: 0, containerWidth: 400) == 1)
        #expect(LootBox.centeredIndex(offset: -120, containerWidth: 400) == 2)
        #expect(LootBox.centeredIndex(offset: -121, containerWidth: 400) == 2)
    }

    @Test func celebratesOnlyPassingGrades() {
        #expect(LootBox.shouldCelebrate(10))
        #expect(!LootBox.shouldCelebrate(9.99))
    }

    @Test func replayEndpointEncodesTheGradeCode() throws {
        let client = APIClient(baseURL: URL(string: "http://localhost:3000")!)
        let request = try client.makeRequest(Endpoints.markGradeNew(code: "FITE S7/MATA"), token: "t")
        #expect(request.httpMethod == "POST")
        #expect(request.url?.absoluteString == "http://localhost:3000/api/v1/grades/FITE%20S7%2FMATA/new")
    }

    @Test func tickThrottleLimitsBurstsButKeepsSlowTicks() {
        var throttle = TickThrottle(minimumInterval: 0.05)
        // The slow end of the roll (last two ticks) is further apart than the interval: every tick fires
        let fired = [10.00, 10.02, 10.049, 10.05, 10.3, 10.7].map { throttle.shouldFire(at: $0) }
        #expect(fired == [true, false, false, true, true, true])
    }

    @Test func reelLabelsArePrecomputedInFrench() {
        let reel = LootBox.makeReel(winning: 18.5) { 0.25 }
        #expect(reel[LootBox.winningIndex].label == "18,50")
        #expect(reel[0].label == "5,00")
    }

    @Test func coreAnimationCurveMatchesTheTickCurve() {
        let function = LootBox.timingFunction
        var first: [Float] = [0, 0]
        var second: [Float] = [0, 0]
        function.getControlPoint(at: 1, values: &first)
        function.getControlPoint(at: 2, values: &second)
        #expect(first == [Float(LootBox.easing.x1), Float(LootBox.easing.y1)])
        #expect(second == [Float(LootBox.easing.x2), Float(LootBox.easing.y2)])
    }
}
