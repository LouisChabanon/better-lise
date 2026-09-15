import SwiftUI

struct AchievementDetailSheet: View {
    let achievement: Achievement

    var body: some View {
        let palette = AchievementPalette(achievement: achievement)
        VStack(spacing: 14) {
            Image(systemName: achievement.isHidden ? "questionmark" : AchievementSymbol.name(for: achievement.icon))
                .font(.system(size: 44, weight: .semibold))
                .foregroundStyle(palette.icon)
                .frame(width: 96, height: 96)
                .background(palette.iconBackground, in: Circle())
                .overlay(Circle().strokeBorder(palette.border, lineWidth: 2))
                .saturation(achievement.isUnlocked ? 1 : 0)
            Text(achievement.title)
                .font(.system(.title2, design: .rounded, weight: .heavy))
                .foregroundStyle(Theme.textPrimary)
                .multilineTextAlignment(.center)
            Text(status)
                .font(.footnote.weight(.semibold))
                .foregroundStyle(achievement.isUnlocked ? palette.caption : Theme.textTertiary)
            if let description = achievement.description {
                Text(description)
                    .font(.body)
                    .foregroundStyle(Theme.textSecondary)
                    .multilineTextAlignment(.center)
            } else if achievement.isHidden {
                Text("Certains succès sont cachés… cherche bien.")
                    .font(.body)
                    .foregroundStyle(Theme.textTertiary)
                    .multilineTextAlignment(.center)
            }
            if let snark = achievement.snark, achievement.isUnlocked {
                Text("« \(snark) »")
                    .font(.callout.italic())
                    .foregroundStyle(Theme.textTertiary)
                    .multilineTextAlignment(.center)
                    .padding(12)
                    .frame(maxWidth: .infinity)
                    .background(Theme.backgroundSecondary, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
            }
        }
        .padding(24)
        .frame(maxHeight: .infinity, alignment: .top)
        .background(Theme.backgroundPrimary.ignoresSafeArea())
    }

    private var status: String {
        guard let unlockedAt = achievement.unlockedAt else { return "Pas encore débloqué" }
        let date = unlockedAt.formatted(.dateTime.day().month(.wide).year().locale(GradeFormat.french))
        return "Débloqué le \(date)"
    }
}
