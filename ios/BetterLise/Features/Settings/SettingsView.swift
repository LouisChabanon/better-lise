import SwiftUI

struct SettingsView: View {
    @Environment(SessionStore.self) private var session
    @Environment(SettingsStore.self) private var settings
    let achievements: AchievementsViewModel
    let health: LiseHealthMonitor
    @Binding var isLoginPresented: Bool
    let onSignOut: () -> Void
    let onDeleteAccount: () async throws -> Void

    @State private var syncError: String?
    @State private var isConfirmingSignOut = false
    @State private var isConfirmingDeletion = false
    @State private var isDeleting = false
    @State private var deletionError: String?
    @State private var didDeleteAccount = false

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

                Section("Extras") {
                    if session.isSignedIn {
                        NavigationLink {
                            AchievementsView(model: achievements)
                        } label: {
                            Label("Succès", systemImage: "trophy")
                        }
                    }
                    NavigationLink {
                        LiseHealthView(monitor: health)
                    } label: {
                        Label("Statut de Lise", systemImage: "waveform.path.ecg")
                    }
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
            .onChange(of: session.isSignedIn) { _, isSignedIn in
                if isSignedIn { didDeleteAccount = false }
            }
            .confirmationDialog("Se déconnecter ?", isPresented: $isConfirmingSignOut, titleVisibility: .visible) {
                Button("Se déconnecter", role: .destructive, action: onSignOut)
            }
            .alert("Supprimer ton compte Better Lise ?", isPresented: $isConfirmingDeletion) {
                Button("Supprimer", role: .destructive, action: deleteAccount)
                Button("Annuler", role: .cancel) {}
            } message: {
                Text(AccountDeletionCopy.confirmation)
            }
        }
    }

    @ViewBuilder
    private var accountSection: some View {
        Section {
            if let username = session.username {
                LabeledContent("Connecté en tant que", value: username)
                Button("Se déconnecter", role: .destructive) { isConfirmingSignOut = true }
            } else {
                Button("Se connecter avec Lise") { isLoginPresented = true }
            }
        } header: {
            Text("Compte")
        } footer: {
            if didDeleteAccount {
                Text(AccountDeletionCopy.done)
            }
        }

        if session.isSignedIn {
            Section {
                Button(role: .destructive) {
                    deletionError = nil
                    isConfirmingDeletion = true
                } label: {
                    HStack {
                        Text("Supprimer mon compte Better Lise")
                        if isDeleting {
                            Spacer()
                            ProgressView()
                        }
                    }
                }
                .disabled(isDeleting)
                .accessibilityIdentifier("deleteAccount")
                if let deletionError {
                    Text(deletionError).font(.caption).foregroundStyle(Theme.danger.foreground)
                }
            } footer: {
                Text(AccountDeletionCopy.summary)
            }
        }
    }

    private func deleteAccount() {
        isDeleting = true
        Task {
            do {
                try await onDeleteAccount()
                didDeleteAccount = true
            } catch {
                deletionError = "Suppression impossible : \(error.localizedDescription)"
            }
            isDeleting = false
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

/// Account deletion wording, shared with Android: it must be explicit that only the Better Lise
/// wrapper is deleted, never the ENSAM Lise account.
enum AccountDeletionCopy {
    static let summary = "Supprime les données que Better Lise conserve sur toi : notes enregistrées, absences, succès, votes de coefficients et notifications. Ton compte Lise de l’ENSAM n’est pas supprimé."
    static let confirmation = "Tes notes enregistrées, absences, succès, votes de coefficients et abonnements aux notifications seront définitivement effacés de Better Lise.\n\nCela ne supprime pas ton compte Lise (lise.ensam.eu) : il reste intact et tu pourras toujours te reconnecter à Better Lise plus tard."
    static let done = "Ton compte Better Lise a été supprimé. Ton compte Lise de l’ENSAM reste inchangé."
}

extension Bundle {
    var appVersion: String {
        let version = infoDictionary?["CFBundleShortVersionString"] as? String ?? "?"
        let build = infoDictionary?["CFBundleVersion"] as? String ?? "?"
        return "\(version) (\(build))"
    }
}
