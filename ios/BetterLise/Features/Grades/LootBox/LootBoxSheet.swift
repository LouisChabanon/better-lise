import SwiftUI

/// Native port of the web casino reveal (components/ui/GradeLootBoxModal.tsx + LootCase.tsx).
struct LootBoxSheet: View {
    let grade: Grade
    /// The reel stopped on the grade: mark it as opened.
    let onReveal: () -> Void
    /// The reveal was shown long enough: move on to the grade detail.
    let onComplete: () -> Void

    private enum Phase: Equatable {
        case ready
        case rolling(startedAt: Date, stop: CGFloat)
        case revealed(stop: CGFloat)
    }

    @State private var phase: Phase = .ready
    @State private var reel: [LootItem] = []
    @State private var sound: LootBoxSound?
    @State private var revealCount = 0
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private var rarity: LootRarity { LootRarity(grade: grade.note) }
    private var isRevealed: Bool { if case .revealed = phase { return true } else { return false } }
    private var isRolling: Bool { if case .rolling = phase { return true } else { return false } }

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            header
            GeometryReader { geometry in
                ZStack {
                    switch phase {
                    case .ready:
                        readyCase
                    case .rolling(let startedAt, let stop):
                        TimelineView(.animation) { context in
                            let offset = LootBox.offset(
                                elapsed: context.date.timeIntervalSince(startedAt),
                                stop: stop,
                                duration: LootBox.rollDuration
                            )
                            ReelStrip(items: reel, offset: offset, winnerHighlighted: false)
                                .modifier(TickFeedback(
                                    index: LootBox.centeredIndex(offset: offset, containerWidth: geometry.size.width),
                                    onTick: { sound?.playTick() }
                                ))
                        }
                    case .revealed(let stop):
                        ReelStrip(items: reel, offset: stop, winnerHighlighted: true)
                    }
                }
                .frame(width: geometry.size.width, height: geometry.size.height)
                .background(Theme.backgroundSecondary)
                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                .overlay {
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .strokeBorder(Theme.backgroundTertiary, lineWidth: 4)
                }
                .overlay { if phase != .ready { reelChrome(width: geometry.size.width) } }
                .modifier(NeonPulse(color: rarity.color, isActive: isRevealed && !reduceMotion))
                .task(id: revealCount) {
                    guard revealCount > 0 else { return }
                    await roll(containerWidth: geometry.size.width)
                }
            }
            .frame(height: 140)

            footer
        }
        .padding(24)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .background(Theme.backgroundPrimary.ignoresSafeArea())
        .overlay {
            if isRevealed, LootBox.shouldCelebrate(grade.note), !reduceMotion {
                ConfettiView().ignoresSafeArea().allowsHitTesting(false)
            }
        }
        .interactiveDismissDisabled(isRolling)
        .sensoryFeedback(.success, trigger: isRevealed) { _, revealed in revealed }
        .onAppear {
            if reel.isEmpty { reel = LootBox.makeReel(winning: grade.note) }
            if sound == nil { sound = LootBoxSound() }
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("Révéler · \(grade.libelle)")
                .font(.system(.title3, design: .rounded, weight: .bold))
                .foregroundStyle(Theme.textPrimary)
                .lineLimit(2)
            Text(grade.code)
                .font(.footnote)
                .foregroundStyle(Theme.textTertiary)
        }
    }

    private var readyCase: some View {
        VStack(spacing: 8) {
            Text("🎁")
                .font(.system(size: 56))
                .phaseAnimator(reduceMotion ? [1.0] : [1.0, 0.8]) { gift, phase in
                    gift.opacity(phase).scaleEffect(0.95 + 0.05 * phase)
                } animation: { _ in .easeInOut(duration: 0.9) }
                .accessibilityHidden(true)
            Text("Prêt à révéler ?")
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(Theme.textTertiary)
        }
    }

    @ViewBuilder
    private var footer: some View {
        switch phase {
        case .ready:
            Button {
                sound?.playOpen()
                revealCount += 1
            } label: {
                Text("Voir la note")
                    .fontWeight(.semibold)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 6)
            }
            .buttonStyle(.borderedProminent)
            .tint(Theme.primary)
            .controlSize(.large)
        case .rolling:
            Text("Ouverture de la caisse…")
                .font(.subheadline.weight(.medium))
                .foregroundStyle(Theme.textTertiary)
                .frame(maxWidth: .infinity)
        case .revealed:
            Text(rarity.label.uppercased())
                .font(.system(.headline, design: .rounded, weight: .heavy))
                .tracking(3)
                .foregroundStyle(.white)
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(rarity.color, in: Capsule())
                .frame(maxWidth: .infinity)
                .transition(.scale.combined(with: .opacity))
        }
    }

    /// Center marker and edge fades, drawn above the reel.
    private func reelChrome(width: CGFloat) -> some View {
        ZStack {
            HStack(spacing: 0) {
                LinearGradient(colors: [Theme.backgroundSecondary, .clear], startPoint: .leading, endPoint: .trailing)
                    .frame(width: width / 4)
                Spacer()
                LinearGradient(colors: [.clear, Theme.backgroundSecondary], startPoint: .leading, endPoint: .trailing)
                    .frame(width: width / 4)
            }
            Rectangle()
                .fill(Theme.backgroundPrimary)
                .frame(width: 2)
        }
        .allowsHitTesting(false)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    }

    private func roll(containerWidth: CGFloat) async {
        let stop = LootBox.stopOffset(containerWidth: containerWidth, jitterUnit: Double.random(in: 0..<1))
        phase = .rolling(startedAt: Date(), stop: stop)
        try? await Task.sleep(for: .seconds(LootBox.rollDuration))
        guard !Task.isCancelled else { return }

        sound?.playReveal()
        withAnimation(.spring(duration: 0.5, bounce: 0.4)) { phase = .revealed(stop: stop) }
        onReveal()

        try? await Task.sleep(for: .seconds(LootBox.revealHoldDuration))
        guard !Task.isCancelled else { return }
        onComplete()
    }
}

/// The horizontal strip of grades; `offset` is applied to the whole row.
private struct ReelStrip: View {
    let items: [LootItem]
    let offset: CGFloat
    let winnerHighlighted: Bool

    var body: some View {
        // The row is ~50 items wide: anchor it to the container's leading edge and let it overflow to the
        // right, so `offset` is measured from the first item (a flexible frame would center the overflow).
        Color.clear
            .overlay(alignment: .leading) {
                HStack(spacing: 0) {
                    ForEach(items) { item in
                        ReelItem(item: item, isWinner: winnerHighlighted && item.id == LootBox.winningIndex)
                    }
                }
                .fixedSize(horizontal: true, vertical: false)
                .offset(x: offset)
            }
    }
}

private struct ReelItem: View {
    let item: LootItem
    let isWinner: Bool

    var body: some View {
        let color = item.rarity.color
        Text(item.grade.formatted(.number.precision(.fractionLength(2)).locale(Locale(identifier: "fr_FR"))))
            .font(.system(size: 26, weight: .heavy, design: .rounded).monospacedDigit())
            .foregroundStyle(.white)
            .shadow(color: .black.opacity(0.35), radius: 2, y: 1)
            .frame(width: LootBox.itemWidth)
            .frame(maxHeight: .infinity)
            .background(color)
            .overlay(Rectangle().strokeBorder(.black.opacity(isWinner ? 0 : 0.25), lineWidth: 3))
            .overlay(alignment: .trailing) { Rectangle().fill(Theme.backgroundSecondary).frame(width: 2) }
            .overlay { if isWinner { Rectangle().strokeBorder(.white.opacity(0.8), lineWidth: 3) } }
            .scaleEffect(isWinner ? 1.06 : 1)
            .shadow(color: isWinner ? color : .clear, radius: 16)
            .zIndex(isWinner ? 1 : 0)
            .accessibilityHidden(!isWinner)
    }
}

/// Selection haptic and tick sound each time an item passes the center marker.
private struct TickFeedback: ViewModifier {
    let index: Int
    let onTick: () -> Void

    func body(content: Content) -> some View {
        content
            .sensoryFeedback(.selection, trigger: index)
            .onChange(of: index) { _, _ in onTick() }
    }
}

/// Neon glow pulsing in the rarity color once revealed (web `modal-neon-glow`).
private struct NeonPulse: ViewModifier {
    let color: Color
    let isActive: Bool

    func body(content: Content) -> some View {
        if isActive {
            content.phaseAnimator([0.4, 1.0]) { view, intensity in
                view.shadow(color: color.opacity(0.9), radius: 10 + 20 * intensity)
            } animation: { _ in .easeInOut(duration: 0.5) }
        } else {
            content
        }
    }
}
