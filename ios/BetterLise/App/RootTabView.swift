import SwiftUI

struct RootTabView: View {
    let environment: AppEnvironment
    @State private var isLoginPresented = false
    @State private var selectedTab: AppTab = .agenda
    @State private var isUnlockedAchievementsPresented = false

    enum AppTab: Hashable { case agenda, grades, absences, settings }

    var body: some View {
        TabView(selection: $selectedTab) {
            AgendaView(model: environment.agenda)
                .tabItem { Label("Agenda", systemImage: "calendar") }
                .tag(AppTab.agenda)
            GradesView(
                model: environment.grades,
                simulator: environment.simulator,
                achievements: environment.achievements,
                isLoginPresented: $isLoginPresented
            )
                .tabItem { Label("Notes", systemImage: "graduationcap") }
                .badge(environment.grades.unreadCount)
                .tag(AppTab.grades)
            AbsencesView(model: environment.absences, isLoginPresented: $isLoginPresented)
                .tabItem { Label("Absences", systemImage: "clock.badge.exclamationmark") }
                .tag(AppTab.absences)
            SettingsView(
                achievements: environment.achievements,
                health: environment.health,
                isLoginPresented: $isLoginPresented,
                onSignOut: { Task { await environment.signOut() } },
                onDeleteAccount: { try await environment.deleteAccount() }
            )
            .tabItem { Label("Réglages", systemImage: "gearshape") }
            .tag(AppTab.settings)
        }
        .sheet(isPresented: $isLoginPresented) {
            LoginView()
        }
        .overlay(alignment: .top) {
            if showsCelebration { celebration }
        }
        .animation(.spring(duration: 0.5, bounce: 0.3), value: showsCelebration)
        .sheet(isPresented: $isUnlockedAchievementsPresented) {
            NavigationStack {
                AchievementsView(model: environment.achievements)
                    .toolbar {
                        ToolbarItem(placement: .confirmationAction) {
                            Button("OK") { isUnlockedAchievementsPresented = false }
                        }
                    }
            }
        }
    }

    /// Unlocked achievements, held back while reveal mode still hides new grades.
    private var showsCelebration: Bool {
        !environment.achievements.pendingCelebration.isEmpty && !AchievementCelebration.shouldDefer(
            revealMode: environment.settings.revealMode,
            unreadGrades: environment.grades.unreadCount
        )
    }

    private var celebration: some View {
        ZStack(alignment: .top) {
            ConfettiView()
                .ignoresSafeArea()
                .allowsHitTesting(false)
            AchievementUnlockBanner(
                achievements: environment.achievements.pendingCelebration,
                onOpen: {
                    environment.achievements.markCelebrated()
                    isUnlockedAchievementsPresented = true
                },
                onDismiss: { environment.achievements.markCelebrated() }
            )
            .padding(.horizontal, 16)
            .padding(.top, 8)
        }
        .transition(.move(edge: .top).combined(with: .opacity))
    }
}
