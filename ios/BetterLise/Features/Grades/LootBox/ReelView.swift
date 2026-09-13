import SwiftUI
import UIKit

/// A request to roll the reel once. A new value starts a new roll.
struct RollRequest: Equatable {
    let id = UUID()
    let duration: TimeInterval
    let jitterUnit: Double
}

/// The lootbox reel. The strip is a static SwiftUI row moved by a Core Animation animation, so the roll
/// runs on the render server at up to 120 Hz whatever the main thread is doing (sounds, haptics, SwiftUI).
struct ReelView: UIViewRepresentable {
    let items: [LootItem]
    let highlightsWinner: Bool
    let roll: RollRequest?
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
        view.setHighlightsWinner(highlightsWinner)
        if let roll {
            view.request(roll)
        }
    }

    static func dismantleUIView(_ view: ReelContainerView, coordinator: ()) {
        view.stopTicking()
    }
}

final class ReelContainerView: UIView {
    var onSoundTick: () -> Void = {}
    var onFinish: () -> Void = {}

    private let items: [LootItem]
    private let host: UIHostingController<ReelRow>
    private var highlightsWinner = false
    private var pendingRoll: RollRequest?
    private var startedRollID: UUID?

    private var displayLink: CADisplayLink?
    private var lastIndex: Int?
    private let haptics = UISelectionFeedbackGenerator()
    private var hapticThrottle = TickThrottle(minimumInterval: 0.035)
    private var soundThrottle = TickThrottle(minimumInterval: 0.055)

    /// Plain view carrying the roll transform. The hosting view lives inside it: SwiftUI resets its own
    /// view's transform when the row re-renders (e.g. winner highlight), which snapped the reel back to 0.
    private let strip = UIView()
    private var stripWidth: CGFloat { LootBox.itemWidth * CGFloat(items.count) }

    init(items: [LootItem]) {
        self.items = items
        host = UIHostingController(rootView: ReelRow(items: items, highlightsWinner: false))
        super.init(frame: .zero)
        clipsToBounds = true
        isUserInteractionEnabled = false
        host.view.backgroundColor = .clear
        host.safeAreaRegions = []
        strip.isUserInteractionEnabled = false
        strip.addSubview(host.view)
        addSubview(strip)
    }

    required init?(coder: NSCoder) { nil }

    override func layoutSubviews() {
        super.layoutSubviews()
        // Bounds + center (not frame) because the layer carries a translation transform
        strip.bounds = CGRect(x: 0, y: 0, width: stripWidth, height: bounds.height)
        strip.center = CGPoint(x: stripWidth / 2, y: bounds.midY)
        host.view.frame = strip.bounds
        startPendingRollIfPossible()
    }

    func setHighlightsWinner(_ value: Bool) {
        guard value != highlightsWinner else { return }
        highlightsWinner = value
        host.rootView = ReelRow(items: items, highlightsWinner: value)
    }

    func request(_ roll: RollRequest) {
        guard roll.id != startedRollID, roll.id != pendingRoll?.id else { return }
        pendingRoll = roll
        startPendingRollIfPossible()
    }

    func stopTicking() {
        displayLink?.invalidate()
        displayLink = nil
    }

    private func startPendingRollIfPossible() {
        guard let roll = pendingRoll, bounds.width > 0 else { return }
        pendingRoll = nil
        startedRollID = roll.id

        let stop = LootBox.stopOffset(containerWidth: bounds.width, jitterUnit: roll.jitterUnit)
        haptics.prepare()
        lastIndex = LootBox.centeredIndex(offset: 0, containerWidth: bounds.width)

        CATransaction.begin()
        CATransaction.setCompletionBlock { [weak self] in
            guard let self else { return }
            stopTicking()
            onFinish()
        }
        let animation = CABasicAnimation(keyPath: "transform.translation.x")
        animation.fromValue = 0
        animation.toValue = stop
        animation.duration = roll.duration
        animation.timingFunction = LootBox.timingFunction
        animation.preferredFrameRateRange = CAFrameRateRange(minimum: 80, maximum: 120, preferred: 120)
        // Model value first, so the strip stays exactly where the animation lands
        strip.layer.setValue(stop, forKeyPath: "transform.translation.x")
        strip.layer.add(animation, forKey: "roll")
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
        let index = LootBox.centeredIndex(offset: offset, containerWidth: bounds.width)
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
    let items: [LootItem]
    let highlightsWinner: Bool

    var body: some View {
        HStack(spacing: 0) {
            ForEach(items) { item in
                ReelItem(item: item, isWinner: highlightsWinner && item.id == LootBox.winningIndex)
            }
        }
    }
}

private struct ReelItem: View {
    let item: LootItem
    let isWinner: Bool

    var body: some View {
        let color = item.rarity.color
        let tile = Text(item.label)
            .font(.system(size: 26, weight: .heavy, design: .rounded).monospacedDigit())
            .foregroundStyle(.white)
            .frame(width: LootBox.itemWidth)
            .frame(maxHeight: .infinity)
            .background(color)
            .overlay(alignment: .trailing) { Color.black.opacity(0.25).frame(width: 2) }
            .accessibilityHidden(!isWinner)

        if isWinner {
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
