import SwiftUI

struct RootTabView: View {
    let environment: AppEnvironment
    @State private var isLoginPresented = false
    @State private var selectedTab: AppTab = .agenda

    enum AppTab: Hashable { case agenda, grades, absences, settings }

    var body: some View {
        TabView(selection: $selectedTab) {
            AgendaView(model: environment.agenda)
                .tabItem { Label("Agenda", systemImage: "calendar") }
                .tag(AppTab.agenda)
            GradesView(model: environment.grades, isLoginPresented: $isLoginPresented)
                .tabItem { Label("Notes", systemImage: "graduationcap") }
                .badge(environment.grades.unreadCount)
                .tag(AppTab.grades)
            AbsencesView(model: environment.absences, isLoginPresented: $isLoginPresented)
                .tabItem { Label("Absences", systemImage: "clock.badge.exclamationmark") }
                .tag(AppTab.absences)
            SettingsView(isLoginPresented: $isLoginPresented) {
                Task { await environment.signOut() }
            }
            .tabItem { Label("Réglages", systemImage: "gearshape") }
            .tag(AppTab.settings)
        }
        .sheet(isPresented: $isLoginPresented) {
            LoginView()
        }
    }
}
