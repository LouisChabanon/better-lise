import SwiftUI

/// Native port of the web casino reveal (components/ui/GradeLootBoxModal.tsx + LootCase.tsx).
struct LootBoxSheet: View {
    let grade: Grade
    /// The reel stopped on the grade: mark it as opened.
    let onReveal: () -> Void
    /// The reveal was shown long enough: move on to the grade detail.
    let onComplete: () -> Void

    private enum Phase: Equatable {
        case ready, rolling, revealed
    }

    @State private var phase: Phase = .ready
    @State private var reel: [LootItem] = []
    @State private var sound: LootBoxSound?
    @State private var roll: RollRequest?
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private var rarity: LootRarity { LootRarity(grade: grade.note) }
    private var isRevealed: Bool { phase == .revealed }
    private var isRolling: Bool { phase == .rolling }

    private var reelMotion: ReelMotion {
        guard let roll else { return .idle }
        return isRevealed ? .landed(roll) : .rolling(roll)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            header
            ZStack {
                if phase == .ready {
                    readyCase
                } else {
                    ReelView(
                        items: reel,
                        highlightsWinner: isRevealed,
                        motion: reelMotion,
                        onSoundTick: { sound?.playTick() },
                        onFinish: reveal
                    )
                    reelChrome
                }
            }
            .frame(maxWidth: .infinity)
            .frame(height: 140)
            .background(Theme.backgroundSecondary)
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .strokeBorder(Theme.backgroundTertiary, lineWidth: 4)
            }
            .modifier(NeonPulse(color: rarity.color, isActive: isRevealed && !reduceMotion))

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
        .task(id: phase) {
            guard phase == .revealed else { return }
            try? await Task.sleep(for: .seconds(LootBox.revealHoldDuration))
            guard !Task.isCancelled else { return }
            onComplete()
        }
        .onAppear {
            if reel.isEmpty { reel = LootBox.makeReel(winning: grade.note) }
            if sound == nil { sound = LootBoxSound() }
        }
    }

    private func reveal() {
        guard phase == .rolling else { return }
        sound?.playReveal()
        withAnimation(.spring(duration: 0.5, bounce: 0.4)) { phase = .revealed }
        onReveal()
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
                roll = RollRequest(duration: LootBox.rollDuration, jitterUnit: Double.random(in: 0..<1))
                phase = .rolling
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
    private var reelChrome: some View {
        GeometryReader { geometry in
            ZStack {
                HStack(spacing: 0) {
                    LinearGradient(colors: [Theme.backgroundSecondary, .clear], startPoint: .leading, endPoint: .trailing)
                        .frame(width: geometry.size.width / 4)
                    Spacer()
                    LinearGradient(colors: [.clear, Theme.backgroundSecondary], startPoint: .leading, endPoint: .trailing)
                        .frame(width: geometry.size.width / 4)
                }
                Rectangle()
                    .fill(Theme.backgroundPrimary)
                    .frame(width: 2)
            }
        }
        .allowsHitTesting(false)
    }
}

/// Neon glow pulsing in the rarity color once revealed (web `modal-neon-glow`).
private struct NeonPulse: ViewModifier {
    let color: Color
    let isActive: Bool

    // One view structure whether active or not: an if/else here gave the reel a new identity when the glow
    // started, so SwiftUI rebuilt it right after the reveal (and it rolled again)
    func body(content: Content) -> some View {
        content.phaseAnimator([0.4, 1.0]) { view, intensity in
            view.shadow(color: color.opacity(isActive ? 0.9 : 0), radius: isActive ? 10 + 20 * intensity : 0)
        } animation: { _ in .easeInOut(duration: 0.5) }
    }
}
