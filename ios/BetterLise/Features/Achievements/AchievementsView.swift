import SwiftUI

struct AchievementsView: View {
    let model: AchievementsViewModel
    @State private var selected: Achievement?

    private let columns = [GridItem(.flexible(), spacing: 12), GridItem(.flexible(), spacing: 12)]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                if let message = model.state.errorMessage {
                    ErrorBanner(message: message) { Task { await model.refresh() } }
                }
                if let achievements = model.state.value, !achievements.isEmpty {
                    AchievementsHeader(summary: model.summary)
                    LazyVGrid(columns: columns, spacing: 12) {
                        ForEach(achievements) { achievement in
                            Button { selected = achievement } label: {
                                AchievementBadge(achievement: achievement)
                            }
                            .buttonStyle(PressableCardStyle())
                        }
                    }
                } else if model.state.isLoading || model.state == .idle {
                    ProgressView("Chargement des succès…")
                        .frame(maxWidth: .infinity, minHeight: 240)
                }
            }
            .padding(16)
        }
        .background(Theme.backgroundSecondary.ignoresSafeArea())
        .navigationTitle("Succès")
        .refreshable { await model.refresh() }
        .task { await model.refresh() }
        .sheet(item: $selected) { achievement in
            AchievementDetailSheet(achievement: achievement)
                .presentationDetents([.medium])
                .presentationDragIndicator(.visible)
        }
    }
}

private struct AchievementsHeader: View {
    let summary: AchievementSummary
    @State private var displayedProgress = 0.0
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        HStack(spacing: 18) {
            ZStack {
                Circle().stroke(Theme.backgroundTertiary, lineWidth: 10)
                Circle()
                    .trim(from: 0, to: displayedProgress)
                    .stroke(Theme.primary, style: StrokeStyle(lineWidth: 10, lineCap: .round))
                    .rotationEffect(.degrees(-90))
                VStack(spacing: 0) {
                    Text(summary.progress.formatted(.percent.precision(.fractionLength(0))))
                        .font(.system(.title2, design: .rounded, weight: .heavy).monospacedDigit())
                        .foregroundStyle(Theme.textPrimary)
                    Text("\(summary.unlocked)/\(summary.total)")
                        .font(.caption2.weight(.semibold).monospacedDigit())
                        .foregroundStyle(Theme.textTertiary)
                }
            }
            .frame(width: 96, height: 96)
            .accessibilityElement(children: .ignore)
            .accessibilityLabel("\(summary.unlocked) succès débloqués sur \(summary.total)")

            VStack(alignment: .leading, spacing: 8) {
                Text("Ta vitrine")
                    .font(.system(.headline, design: .rounded, weight: .bold))
                    .foregroundStyle(Theme.textPrimary)
                stat("star.fill", "Légendaires", "\(summary.legendary)", badge: Theme.warning)
                stat("star.leadinghalf.filled", "Rares", "\(summary.rare)", badge: Theme.success)
                stat("eye.slash.fill", "Secrets", "\(summary.secretsFound)/\(summary.secrets)", badge: Theme.neutral)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .card()
        .onAppear { animate(to: summary.progress) }
        .onChange(of: summary.progress) { _, value in animate(to: value) }
    }

    private func animate(to value: Double) {
        withAnimation(reduceMotion ? nil : .spring(duration: 1, bounce: 0.2)) { displayedProgress = value }
    }

    private func stat(_ symbol: String, _ label: String, _ value: String, badge: Theme.Badge) -> some View {
        HStack(spacing: 8) {
            Label(label, systemImage: symbol)
                .font(.footnote.weight(.semibold))
                .foregroundStyle(badge.foreground)
            Spacer(minLength: 4)
            Text(value)
                .font(.footnote.weight(.bold).monospacedDigit())
                .foregroundStyle(badge.foreground)
                .padding(.horizontal, 8)
                .padding(.vertical, 2)
                .background(badge.background, in: Capsule())
        }
    }
}

struct AchievementBadge: View {
    let achievement: Achievement
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        let palette = AchievementPalette(achievement: achievement)
        VStack(spacing: 8) {
            Image(systemName: symbol)
                .font(.system(size: 30, weight: .semibold))
                .foregroundStyle(palette.icon)
                .frame(width: 60, height: 60)
                .background(palette.iconBackground, in: Circle())
            Text(achievement.title)
                .font(.system(.subheadline, design: .rounded, weight: .bold))
                .foregroundStyle(achievement.isUnlocked ? Theme.textPrimary : Theme.textTertiary)
                .multilineTextAlignment(.center)
                .lineLimit(2)
            if let description = achievement.description {
                Text(description)
                    .font(.caption2)
                    .foregroundStyle(Theme.textTertiary)
                    .multilineTextAlignment(.center)
                    .lineLimit(2)
            }
            Spacer(minLength: 0)
            Text(caption)
                .font(.system(size: 9, weight: .heavy))
                .tracking(1)
                .foregroundStyle(palette.caption)
        }
        .padding(.horizontal, 10)
        .padding(.top, 16)
        .padding(.bottom, 10)
        .frame(maxWidth: .infinity, minHeight: 176)
        .background(palette.background)
        .overlay(alignment: .top) {
            if achievement.isUnlocked { palette.stripe.frame(height: 4) }
        }
        .overlay {
            if achievement.isUnlocked, achievement.rarity == .legendary, !reduceMotion { ShimmerOverlay() }
        }
        .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
        .contentShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 22, style: .continuous).strokeBorder(palette.border, lineWidth: 1))
        .saturation(achievement.isUnlocked ? 1 : 0)
        .opacity(achievement.isUnlocked ? 1 : 0.75)
        .accessibilityElement(children: .combine)
        .accessibilityValue(achievement.isUnlocked ? "Débloqué" : "Verrouillé")
        .accessibilityIdentifier("achievement-\(achievement.code)")
    }

    private var symbol: String {
        if achievement.isHidden { return "questionmark" }
        return achievement.isUnlocked ? AchievementSymbol.name(for: achievement.icon) : "lock.fill"
    }

    private var caption: String {
        if achievement.isHidden { return "SECRET" }
        switch achievement.rarity {
        case .common: return "COMMUN"
        case .rare: return "RARE"
        case .legendary: return "LÉGENDAIRE"
        }
    }
}

/// Rarity colors, reusing the grade badge palette like the web cards.
struct AchievementPalette {
    let background: Color
    let border: Color
    let stripe: Color
    let icon: Color
    let iconBackground: Color
    let caption: Color

    init(achievement: Achievement) {
        guard achievement.isUnlocked else {
            background = Theme.backgroundPrimary
            border = Theme.backgroundTertiary
            stripe = .clear
            icon = Theme.textTertiary
            iconBackground = Theme.backgroundSecondary
            caption = Theme.textTertiary
            return
        }
        switch achievement.rarity {
        case .common:
            background = Theme.backgroundPrimary
            border = Theme.backgroundTertiary
            stripe = Theme.primary
            icon = Theme.primary
            iconBackground = Theme.primarySoft
            caption = Theme.textTertiary
        case .rare:
            background = Theme.success.background
            border = Theme.success.foreground.opacity(0.25)
            stripe = Theme.success.foreground
            icon = Theme.success.foreground
            iconBackground = Theme.backgroundPrimary.opacity(0.6)
            caption = Theme.success.foreground
        case .legendary:
            background = Theme.warning.background
            border = Theme.warning.foreground.opacity(0.35)
            stripe = Theme.warning.foreground
            icon = Theme.warning.foreground
            iconBackground = Theme.backgroundPrimary.opacity(0.6)
            caption = Theme.warning.foreground
        }
    }
}

/// Light sweep across legendary badges.
private struct ShimmerOverlay: View {
    @State private var phase: CGFloat = -1

    var body: some View {
        GeometryReader { proxy in
            LinearGradient(colors: [.clear, .white.opacity(0.35), .clear], startPoint: .leading, endPoint: .trailing)
                .frame(width: proxy.size.width * 0.6)
                .rotationEffect(.degrees(20))
                .offset(x: phase * proxy.size.width * 1.6)
        }
        .allowsHitTesting(false)
        .accessibilityHidden(true)
        .onAppear {
            withAnimation(.easeInOut(duration: 2.4).delay(0.6).repeatForever(autoreverses: false)) { phase = 1 }
        }
    }
}

struct PressableCardStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.96 : 1)
            .animation(.snappy(duration: 0.2), value: configuration.isPressed)
    }
}
