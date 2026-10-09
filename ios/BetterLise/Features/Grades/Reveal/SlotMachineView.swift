import SwiftUI
import UIKit

/// Slot machine grade reveal (web components/slot-machine). One timeline drives the four reels: each reel's
/// position is a pure function of the time since the start, so a rebuilt view never replays the spin.
struct SlotMachineView: View {
    let grade: Double
    /// Throttled tick for sound (haptics are handled here).
    let onSoundTick: () -> Void
    /// The last reel landed.
    let onFinish: () -> Void

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var startDate: Date?
    @State private var stoppedCount = 0
    @State private var haptics = UISelectionFeedbackGenerator()
    @State private var hapticThrottle = TickThrottle(minimumInterval: 0.035)
    @State private var soundThrottle = TickThrottle(minimumInterval: 0.055)

    private var reels: [SlotReel] { SlotReveal.reels(for: grade, reduceMotion: reduceMotion) }
    private var isRevealed: Bool { stoppedCount == SlotReveal.reelCount }
    private var label: String {
        grade.formatted(.number.precision(.fractionLength(2)).locale(Locale(identifier: "fr_FR")))
    }

    var body: some View {
        TimelineView(.animation(paused: startDate == nil || isRevealed)) { context in
            let elapsed = startDate.map { context.date.timeIntervalSince($0) } ?? 0
            machine(elapsed: isRevealed ? .infinity : elapsed)
                .onChange(of: SlotReveal.tickKey(reels, at: elapsed)) { tick(at: elapsed) }
                .onChange(of: SlotReveal.stoppedCount(reels, at: elapsed)) { _, count in land(count) }
        }
        .onAppear {
            guard startDate == nil else { return }
            haptics.prepare()
            startDate = .now
        }
        .accessibilityElement(children: .ignore)
        .accessibilityIdentifier("reel")
        .accessibilityLabel("Machine à sous")
        .accessibilityValue(isRevealed ? "Arrêtée sur \(label)" : "Défilement en cours")
    }

    private func machine(elapsed: TimeInterval) -> some View {
        // Landed digits stay neutral until the last reel stops, so the color does not give the range away
        let landedColor = isRevealed ? GradeRarity(grade: grade).color : Theme.textPrimary
        return HStack(alignment: .center, spacing: 6) {
            ForEach(reels, id: \.index) { reel in
                SlotReelView(reel: reel, elapsed: elapsed, landedColor: landedColor)
                if reel.index == SlotReveal.decimalSeparatorAfter {
                    Text(",")
                        .font(SlotReelView.digitFont)
                        .foregroundStyle(Theme.textTertiary)
                }
            }
            Text("/20")
                .font(.system(size: 20, weight: .bold, design: .rounded))
                .foregroundStyle(Theme.textTertiary)
                .padding(.leading, 2)
        }
    }

    private func tick(at elapsed: TimeInterval) {
        guard startDate != nil else { return }
        if hapticThrottle.shouldFire(at: elapsed) { haptics.selectionChanged() }
        if soundThrottle.shouldFire(at: elapsed) { onSoundTick() }
    }

    private func land(_ count: Int) {
        guard count > stoppedCount else { return }
        withAnimation(.spring(duration: 0.4, bounce: 0.45)) { stoppedCount = count }
        if count == SlotReveal.reelCount { onFinish() }
    }
}

private struct SlotReelView: View {
    static let digitHeight: CGFloat = 56
    static let windowHeight = digitHeight * 1.6
    static let digitFont = Font.system(size: 46, weight: .black, design: .rounded).monospacedDigit()
    private static let stripOffset = (windowHeight - digitHeight) / 2

    let reel: SlotReel
    let elapsed: TimeInterval
    let landedColor: Color

    var body: some View {
        let isStopped = reel.isStopped(at: elapsed)
        ZStack(alignment: .top) {
            strip(isStopped: isStopped)
                .offset(y: Self.stripOffset - reel.position(at: elapsed) * Self.digitHeight)
                .opacity(isStopped ? 0.3 : 1)
                .blur(radius: isStopped ? 0 : 1.2)

            if isStopped {
                Text("\(reel.digit)")
                    .font(Self.digitFont)
                    .foregroundStyle(landedColor)
                    .opacity(SlotReveal.isDimmed(reel) ? 0.25 : 1)
                    .frame(height: Self.digitHeight)
                    .offset(y: Self.stripOffset)
                    .transition(.scale(scale: 1.35).combined(with: .opacity))
            }
        }
        .frame(width: 52, height: Self.windowHeight, alignment: .top)
        .clipped()
        .mask {
            LinearGradient(stops: [
                .init(color: .clear, location: 0),
                .init(color: .black, location: 0.22),
                .init(color: .black, location: 0.78),
                .init(color: .clear, location: 1),
            ], startPoint: .top, endPoint: .bottom)
        }
        .background(Theme.backgroundPrimary)
        .overlay { innerShadow }
        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 10, style: .continuous)
                .strokeBorder(landedColor, lineWidth: 2)
                .shadow(color: landedColor.opacity(0.6), radius: 6)
                .opacity(isStopped ? 1 : 0)
        }
        .animation(.easeOut(duration: 0.5), value: landedColor)
    }

    /// Only the visible digits are drawn: the full strip is up to 90 digits long.
    private func strip(isStopped: Bool) -> some View {
        let first = max(0, Int(reel.position(at: elapsed)) - 1)
        let visible = first..<min(first + 4, reel.strip.count)
        return VStack(spacing: 0) {
            ForEach(visible, id: \.self) { index in
                Text("\(index % SlotReveal.digitsPerLoop)")
                    .font(Self.digitFont)
                    .foregroundStyle(Theme.textPrimary)
                    .frame(height: Self.digitHeight)
                    // The landed digit is drawn on top, in its own color
                    .opacity(isStopped && index == reel.target ? 0 : 1)
            }
        }
        .frame(maxWidth: .infinity)
        .offset(y: CGFloat(first) * Self.digitHeight)
    }

    private var innerShadow: some View {
        VStack {
            LinearGradient(colors: [.black.opacity(0.35), .clear], startPoint: .top, endPoint: .bottom).frame(height: 12)
            Spacer()
            LinearGradient(colors: [.clear, .black.opacity(0.35)], startPoint: .top, endPoint: .bottom).frame(height: 12)
        }
        .allowsHitTesting(false)
    }
}
