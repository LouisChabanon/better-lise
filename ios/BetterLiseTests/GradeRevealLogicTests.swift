import Foundation
import Testing
@testable import BetterLise

struct GradeRevealLogicTests {
    @Test(arguments: [
        (20.0, GradeRarity.legendary), (18.0, .legendary), (17.99, .epic), (14.0, .epic),
        (13.5, .common), (10.0, .common), (9.99, .basic), (7.0, .basic), (6.99, .poor), (0.0, .poor),
    ])
    func rarityThresholdsMatchTheWeb(grade: Double, rarity: GradeRarity) {
        #expect(GradeRarity(grade: grade) == rarity)
    }

    @Test func rarityColorsAreTheWebTailwindTokens() {
        #expect(GradeRarity.legendary.hex == 0xFFB900)
        #expect(GradeRarity.epic.hex == 0xA800B7)
        #expect(GradeRarity.common.hex == 0x155DFC)
        #expect(GradeRarity.basic.hex == 0xCA3500)
        #expect(GradeRarity.poor.hex == 0xC10007)
    }

    @Test func reelHidesTheRealGradeAtTheTargetIndex() {
        var values = [0.0, 0.5, 0.999].makeIterator()
        var generated = 0
        let reel = GradeReveal.makeReel(target: 16.25) {
            generated += 1
            return values.next() ?? 0.25
        }

        #expect(reel.count == GradeReveal.reelSize)
        #expect(reel[GradeReveal.targetIndex].grade == 16.25)
        #expect(reel[0].grade == 0)
        #expect(reel[1].grade == 10)
        #expect(abs(reel[2].grade - 19.98) < 0.001)
        #expect(reel.allSatisfy { (0...20).contains($0.grade) })
        #expect(Set(reel.map(\.id)).count == GradeReveal.reelSize)
    }

    @Test func stopOffsetCentersTheTargetItemWithBoundedJitter() {
        let width: CGFloat = 400
        let centered = GradeReveal.stopOffset(containerWidth: width, jitterUnit: 0.5)
        #expect(abs(centered - (-(47 * 120) + (200 - 60))) < 0.001)
        #expect(GradeReveal.centeredIndex(offset: centered, containerWidth: width) == GradeReveal.targetIndex)

        for unit in [0.0, 0.25, 0.75, 0.9999] {
            let offset = GradeReveal.stopOffset(containerWidth: width, jitterUnit: unit)
            #expect(abs(offset - centered) <= 24)
            #expect(GradeReveal.centeredIndex(offset: offset, containerWidth: width) == GradeReveal.targetIndex)
        }
    }

    @Test func easingMatchesTheWebCurve() {
        let curve = GradeReveal.easing
        #expect(curve.value(at: 0) == 0)
        #expect(curve.value(at: 1) == 1)
        let samples = stride(from: 0.0, through: 1, by: 0.01).map(curve.value(at:))
        #expect(zip(samples, samples.dropFirst()).allSatisfy { $0 <= $1 + 1e-9 })
        // Fast start, long deceleration: most of the distance is covered early
        #expect(curve.value(at: 0.25) > 0.5)
        #expect(curve.value(at: 0.9) > 0.97)
    }

    @Test func reelOffsetTravelsFromZeroToTheStop() {
        #expect(GradeReveal.offset(elapsed: 0, stop: -5000, duration: 8) == 0)
        #expect(GradeReveal.offset(elapsed: -1, stop: -5000, duration: 8) == 0)
        #expect(GradeReveal.offset(elapsed: 8, stop: -5000, duration: 8) == -5000)
        #expect(GradeReveal.offset(elapsed: 30, stop: -5000, duration: 8) == -5000)
        let mid = GradeReveal.offset(elapsed: 4, stop: -5000, duration: 8)
        #expect(mid < -2500 && mid > -5000)
    }

    @Test func centeredIndexAdvancesAsTheReelScrolls() {
        #expect(GradeReveal.centeredIndex(offset: 0, containerWidth: 400) == 1)
        #expect(GradeReveal.centeredIndex(offset: -120, containerWidth: 400) == 2)
        #expect(GradeReveal.centeredIndex(offset: -121, containerWidth: 400) == 2)
    }

    @Test func celebratesOnlyPassingGrades() {
        #expect(GradeReveal.shouldCelebrate(10))
        #expect(!GradeReveal.shouldCelebrate(9.99))
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
        let reel = GradeReveal.makeReel(target: 18.5) { 0.25 }
        #expect(reel[GradeReveal.targetIndex].label == "18,50")
        #expect(reel[0].label == "5,00")
    }

    @Test func coreAnimationCurveMatchesTheTickCurve() {
        let function = GradeReveal.timingFunction
        var first: [Float] = [0, 0]
        var second: [Float] = [0, 0]
        function.getControlPoint(at: 1, values: &first)
        function.getControlPoint(at: 2, values: &second)
        #expect(first == [Float(GradeReveal.easing.x1), Float(GradeReveal.easing.y1)])
        #expect(second == [Float(GradeReveal.easing.x2), Float(GradeReveal.easing.y2)])
    }
}
