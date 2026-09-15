import SwiftUI

/// Shown over the app when achievements unlock, with confetti.
struct AchievementUnlockBanner: View {
    let achievements: [Achievement]
    let onOpen: () -> Void
    let onDismiss: () -> Void

    @State private var didAppear = false

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: AchievementSymbol.name(for: achievements.first?.icon))
                .font(.system(size: 22, weight: .bold))
                .foregroundStyle(Theme.warning.foreground)
                .frame(width: 44, height: 44)
                .background(Theme.warning.background, in: Circle())
                .symbolEffect(.bounce, value: didAppear)
            VStack(alignment: .leading, spacing: 2) {
                Text(achievements.count > 1 ? "\(achievements.count) succès débloqués !" : "Succès débloqué !")
                    .font(.caption.weight(.heavy))
                    .foregroundStyle(Theme.primary)
                Text(achievements.map(\.title).joined(separator: " · "))
                    .font(.system(.subheadline, design: .rounded, weight: .bold))
                    .foregroundStyle(Theme.textPrimary)
                    .lineLimit(2)
            }
            Spacer(minLength: 4)
            Button("Fermer", systemImage: "xmark", action: onDismiss)
                .labelStyle(.iconOnly)
                .font(.footnote.weight(.bold))
                .foregroundStyle(Theme.textTertiary)
                .frame(width: 32, height: 32)
                .contentShape(Rectangle())
        }
        .padding(12)
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 22, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 22, style: .continuous).strokeBorder(Theme.primary.opacity(0.25), lineWidth: 1))
        .shadow(color: .black.opacity(0.15), radius: 18, y: 8)
        .contentShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
        .onTapGesture(perform: onOpen)
        .accessibilityElement(children: .combine)
        .accessibilityAddTraits(.isButton)
        .accessibilityIdentifier("achievementBanner")
        .sensoryFeedback(.success, trigger: didAppear)
        .onAppear { didAppear = true }
    }
}
