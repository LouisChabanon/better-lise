import SwiftUI

struct SettingsView: View {
    @Environment(SessionStore.self) private var session
    @Environment(SettingsStore.self) private var settings
    @Binding var isLoginPresented: Bool
    let onSignOut: () -> Void

    @State private var syncError: String?
    @State private var isConfirmingSignOut = false

    var body: some View {
        @Bindable var settings = settings
        NavigationStack {
            Form {
                accountSection

                Section {
                    TextField("20xx-xxxx", text: $settings.liseId)
                        .keyboardType(.numbersAndPunctuation)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                    if !settings.liseId.isEmpty && !settings.hasValidLiseId {
                        Text("Format attendu : 20xx-xxxx")
                            .font(.caption)
                            .foregroundStyle(Theme.danger.foreground)
                    }
                } header: {
                    Text("Identifiant Lise")
                } footer: {
                    Text("Utilisé pour afficher ton emploi du temps, même sans connexion.")
                }

                Section("Campus & promo") {
                    Picker("Tabagn'ss", selection: $settings.campus) {
                        ForEach(Campus.allCases) { Text($0.displayName).tag($0) }
                    }
                    Picker("Demi-promo", selection: $settings.promo) {
                        Text("Non renseignée").tag(Promo?.none)
                        ForEach(Promo.allCases) { Text($0.rawValue).tag(Promo?.some($0)) }
                    }
                    Toggle("Afficher le menu du RU", isOn: $settings.showRU)
                        .tint(Theme.primary)
                    if let syncError {
                        Text(syncError).font(.caption).foregroundStyle(Theme.danger.foreground)
                    }
                }

                Section {
                    Toggle(isOn: $settings.revealMode) {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Mode Révélation")
                            Text("Révélation animée des nouvelles notes")
                                .font(.caption)
                                .foregroundStyle(Theme.textTertiary)
                        }
                    }
                    .tint(Theme.primary)
                } header: {
                    Text("Interface")
                }

                Section("À propos") {
                    LabeledContent("Version", value: Bundle.main.appVersion)
                    Link(destination: URL(string: "https://github.com/LouisChabanon/better-lise")!) {
                        Label("Code source", systemImage: "chevron.left.forwardslash.chevron.right")
                    }
                    Link(destination: URL(string: "https://github.com/LouisChabanon/better-lise/wiki/Privacy-Policy")!) {
                        Label("Politique de confidentialité", systemImage: "hand.raised")
                    }
                }
            }
            .navigationTitle("Réglages")
            .onChange(of: settings.campus) { syncProfile() }
            .onChange(of: settings.promo) { syncProfile() }
            .confirmationDialog("Se déconnecter ?", isPresented: $isConfirmingSignOut, titleVisibility: .visible) {
                Button("Se déconnecter", role: .destructive, action: onSignOut)
            }
        }
    }

    @ViewBuilder
    private var accountSection: some View {
        Section("Compte") {
            if let username = session.username {
                LabeledContent("Connecté en tant que", value: username)
                Button("Se déconnecter", role: .destructive) { isConfirmingSignOut = true }
            } else {
                Button("Se connecter avec Lise") { isLoginPresented = true }
            }
        }
    }

    /// Campus and promo are also stored server-side for new-grade notifications.
    private func syncProfile() {
        guard session.isSignedIn else { return }
        let promo = settings.promo?.rawValue
        let campus = settings.campus.rawValue
        Task {
            do {
                _ = try await session.send(Endpoints.updateProfile(promo: promo, tbk: campus))
                syncError = nil
            } catch {
                syncError = "Synchronisation impossible : \(error.localizedDescription)"
            }
        }
    }
}

extension Bundle {
    var appVersion: String {
        let version = infoDictionary?["CFBundleShortVersionString"] as? String ?? "?"
        let build = infoDictionary?["CFBundleVersion"] as? String ?? "?"
        return "\(version) (\(build))"
    }
}
