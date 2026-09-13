import Testing
import UIKit
@testable import BetterLise

@MainActor
struct ReelContainerViewTests {
    private func makeView() -> ReelContainerView {
        let view = ReelContainerView(items: LootBox.makeReel(winning: 18.5) { 0.3 })
        view.frame = CGRect(x: 0, y: 0, width: 400, height: 140)
        return view
    }

    private let request = RollRequest(duration: 8, jitterUnit: 0.5)

    @Test func aRollRequestStartsOnlyOnce() {
        let view = makeView()

        view.apply(.rolling(request))
        view.layoutIfNeeded()
        view.apply(.rolling(request))
        view.setNeedsLayout()
        view.layoutIfNeeded()

        #expect(view.rollStartCount == 1)
        #expect(view.isAnimatingRoll)
        #expect(view.accessibilityValue == "Ouverture en cours")
    }

    @Test func aRecreatedReelShowsTheLandedPositionWithoutRollingAgain() {
        // SwiftUI can rebuild the reel after the reveal: it must stay on the grade, not replay the roll
        let view = makeView()

        view.apply(.landed(request))
        view.layoutIfNeeded()

        #expect(view.rollStartCount == 0)
        #expect(!view.isAnimatingRoll)
        #expect(view.accessibilityValue == "Arrêtée sur 18,50")
        let stop = LootBox.stopOffset(containerWidth: 400, jitterUnit: request.jitterUnit)
        #expect(abs(view.stripTranslation - stop) < 0.001)
    }

    @Test func landingAfterARollKeepsTheSameStop() {
        let view = makeView()
        view.apply(.rolling(request))
        view.layoutIfNeeded()

        view.apply(.landed(request))

        #expect(view.rollStartCount == 1)
        let stop = LootBox.stopOffset(containerWidth: 400, jitterUnit: request.jitterUnit)
        #expect(abs(view.stripTranslation - stop) < 0.001)
    }
}
