import SwiftUI
import UIKit

/// A request to roll the reel once. A new value starts a new roll.
struct RollRequest: Equatable {
    let id = UUID()
    let duration: TimeInterval
    let jitterUnit: Double
}

/// What the reel shows. `landed` is idempotent: a reel rebuilt by SwiftUI after the reveal jumps straight to
/// the stop instead of replaying the roll.
enum ReelMotion: Equatable {
    case idle
    case rolling(RollRequest)
    case landed(RollRequest)
}

/// The reveal reel. The strip is a static SwiftUI row moved by a Core Animation animation, so the roll
/// runs on the render server at up to 120 Hz whatever the main thread is doing (sounds, haptics, SwiftUI).
struct ReelView: UIViewRepresentable {
    let items: [RevealItem]
    let highlightsTarget: Bool
    let motion: ReelMotion
    /// Throttled tick for sound (haptics are handled internally).
    let onSoundTick: () -> Void
    /// The motion really ended (Core Animation completion).
    let onFinish: () -> Void

    func makeUIView(context: Context) -> ReelContainerView {
        ReelContainerView(items: items)
    }

    func updateUIView(_ view: ReelContainerView, context: Context) {
        view.onSoundTick = onSoundTick
        view.onFinish = onFinish
        view.setHighlightsTarget(highlightsTarget)
        view.apply(motion)
    }

    static func dismantleUIView(_ view: ReelContainerView, coordinator: ()) {
        view.stopTicking()
    }
}

final class ReelContainerView: UIView {
    var onSoundTick: () -> Void = {}
    var onFinish: () -> Void = {}

    private let items: [RevealItem]
    private let host: UIHostingController<ReelRow>
    private var highlightsTarget = false
    private var pendingMotion: ReelMotion = .idle
    private var handledRollID: UUID?

    /// Number of roll animations started (exposed for tests).
    private(set) var rollStartCount = 0
    var isAnimatingRoll: Bool { strip.layer.animation(forKey: Self.rollAnimationKey) != nil }
    var stripTranslation: CGFloat { (strip.layer.value(forKeyPath: "transform.translation.x") as? CGFloat) ?? 0 }
    private static let rollAnimationKey = "roll"

    private var displayLink: CADisplayLink?
    private var lastIndex: Int?
    private let haptics = UISelectionFeedbackGenerator()
    private var hapticThrottle = TickThrottle(minimumInterval: 0.035)
    private var soundThrottle = TickThrottle(minimumInterval: 0.055)

    /// Plain view carrying the roll transform. The hosting view lives inside it: SwiftUI resets its own
    /// view's transform when the row re-renders (e.g. winner highlight), which snapped the reel back to 0.
    private let strip = UIView()
    private var stripWidth: CGFloat { GradeReveal.itemWidth * CGFloat(items.count) }

    init(items: [RevealItem]) {
        self.items = items
        host = UIHostingController(rootView: ReelRow(items: items, highlightsTarget: false))
        super.init(frame: .zero)
        clipsToBounds = true
        isUserInteractionEnabled = false
        host.view.backgroundColor = .clear
        host.safeAreaRegions = []
        strip.isUserInteractionEnabled = false
        strip.addSubview(host.view)
        addSubview(strip)

        // One accessibility element describing the roll: VoiceOver users hear the outcome, and UI tests can
        // tell a running roll from a landed one (element frames only reflect the final model position)
        isAccessibilityElement = true
        accessibilityIdentifier = "reel"
        accessibilityLabel = "Défilement des notes"
    }

    required init?(coder: NSCoder) { nil }

    override func layoutSubviews() {
        super.layoutSubviews()
        // Bounds + center (not frame) because the layer carries a translation transform
        strip.bounds = CGRect(x: 0, y: 0, width: stripWidth, height: bounds.height)
        strip.center = CGPoint(x: stripWidth / 2, y: bounds.midY)
        host.view.frame = strip.bounds
        applyPendingMotionIfPossible()
    }

    func setHighlightsTarget(_ value: Bool) {
        guard value != highlightsTarget else { return }
        highlightsTarget = value
        host.rootView = ReelRow(items: items, highlightsTarget: value)
    }

    func apply(_ motion: ReelMotion) {
        switch motion {
        case .idle:
            return
        case .rolling(let roll):
            // Each request rolls once, however many times SwiftUI updates the view
            guard roll.id != handledRollID else { return }
        case .landed(let roll):
            // Already rolled here: the animation's model value is the stop, nothing to do
            guard roll.id != handledRollID else { return }
        }
        pendingMotion = motion
        applyPendingMotionIfPossible()
    }

    func stopTicking() {
        displayLink?.invalidate()
        displayLink = nil
    }

    private func applyPendingMotionIfPossible() {
        guard bounds.width > 0 else { return }
        let motion = pendingMotion
        pendingMotion = .idle
        switch motion {
        case .idle:
            return
        case .rolling(let roll):
            handledRollID = roll.id
            startRoll(roll)
        case .landed(let roll):
            handledRollID = roll.id
            let stop = GradeReveal.stopOffset(containerWidth: bounds.width, jitterUnit: roll.jitterUnit)
            CATransaction.begin()
            CATransaction.setDisableActions(true)
            strip.layer.setValue(stop, forKeyPath: "transform.translation.x")
            CATransaction.commit()
            markLanded()
        }
    }

    private func markLanded() {
        accessibilityValue = "Arrêtée sur \(items[GradeReveal.targetIndex].label)"
    }

    private func startRoll(_ roll: RollRequest) {
        rollStartCount += 1
        accessibilityValue = "Défilement en cours"
        let stop = GradeReveal.stopOffset(containerWidth: bounds.width, jitterUnit: roll.jitterUnit)
        haptics.prepare()
        lastIndex = GradeReveal.centeredIndex(offset: 0, containerWidth: bounds.width)

        CATransaction.begin()
        CATransaction.setCompletionBlock { [weak self] in
            guard let self else { return }
            stopTicking()
            markLanded()
            onFinish()
        }
        let animation = CABasicAnimation(keyPath: "transform.translation.x")
        animation.fromValue = 0
        animation.toValue = stop
        animation.duration = roll.duration
        animation.timingFunction = GradeReveal.timingFunction
        animation.preferredFrameRateRange = CAFrameRateRange(minimum: 80, maximum: 120, preferred: 120)
        // Model value first, so the strip stays exactly where the animation lands
        strip.layer.setValue(stop, forKeyPath: "transform.translation.x")
        strip.layer.add(animation, forKey: Self.rollAnimationKey)
        CATransaction.commit()

        startTicking()
    }

    private func startTicking() {
        stopTicking()
        let link = CADisplayLink(target: DisplayLinkProxy(self), selector: #selector(DisplayLinkProxy.step(_:)))
        link.preferredFrameRateRange = CAFrameRateRange(minimum: 60, maximum: 120, preferred: 120)
        link.add(to: .main, forMode: .common)
        displayLink = link
    }

    /// Reads what is actually on screen, so ticks line up with the visuals.
    fileprivate func step(_ link: CADisplayLink) {
        guard let offset = strip.layer.presentation()?.value(forKeyPath: "transform.translation.x") as? CGFloat else { return }
        let index = GradeReveal.centeredIndex(offset: offset, containerWidth: bounds.width)
        guard index != lastIndex else { return }
        lastIndex = index

        if hapticThrottle.shouldFire(at: link.timestamp) {
            haptics.selectionChanged()
        }
        if soundThrottle.shouldFire(at: link.timestamp) {
            onSoundTick()
        }
    }
}

/// Breaks the retain cycle between `CADisplayLink` and its target.
@MainActor
private final class DisplayLinkProxy: NSObject {
    weak var target: ReelContainerView?

    init(_ target: ReelContainerView) {
        self.target = target
    }

    @objc func step(_ link: CADisplayLink) {
        guard let target else {
            link.invalidate()
            return
        }
        target.step(link)
    }
}

/// The static row of grades rendered once into the moving layer.
struct ReelRow: View {
    let items: [RevealItem]
    let highlightsTarget: Bool

    var body: some View {
        HStack(spacing: 0) {
            ForEach(items) { item in
                ReelItem(item: item, isTarget: highlightsTarget && item.id == GradeReveal.targetIndex)
            }
        }
    }
}

private struct ReelItem: View {
    let item: RevealItem
    let isTarget: Bool

    var body: some View {
        let color = item.rarity.color
        let tile = Text(item.label)
            .font(.system(size: 26, weight: .heavy, design: .rounded).monospacedDigit())
            .foregroundStyle(.white)
            .frame(width: GradeReveal.itemWidth)
            .frame(maxHeight: .infinity)
            .background(color)
            .overlay(alignment: .trailing) { Color.black.opacity(0.25).frame(width: 2) }
            .accessibilityHidden(!isTarget)

        if isTarget {
            tile
                .overlay { Rectangle().strokeBorder(.white.opacity(0.85), lineWidth: 3) }
                .scaleEffect(1.06)
                .shadow(color: color, radius: 16)
                .zIndex(1)
                .transition(.scale)
        } else {
            tile
        }
    }
}
