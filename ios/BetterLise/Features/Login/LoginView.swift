import SwiftUI

struct LoginView: View {
    @Environment(SessionStore.self) private var session
    @Environment(SettingsStore.self) private var settings
    @Environment(\.dismiss) private var dismiss

    @State private var username = ""
    @State private var password = ""
    @State private var remember = true
    @State private var isSubmitting = false
    @State private var errorMessage: String?
    @FocusState private var focusedField: Field?

    private enum Field { case username, password }

    private var canSubmit: Bool {
        LiseID.isValid(username) && !password.isEmpty && !isSubmitting
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 28) {
                    header
                    form
                    if let errorMessage {
                        ErrorBanner(message: errorMessage)
                    }
                    submitButton
                    Text("Tes identifiants sont envoyés uniquement à Lise via le serveur Better Lise. Le mot de passe n'est conservé que dans le trousseau de cet appareil si « Rester connecté » est activé.")
                        .font(.footnote)
                        .foregroundStyle(Theme.textTertiary)
                }
                .padding(24)
            }
            .background(Theme.backgroundSecondary.ignoresSafeArea())
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Annuler") { dismiss() }
                }
            }
            .onAppear {
                if username.isEmpty { username = settings.liseId }
                focusedField = username.isEmpty ? .username : .password
            }
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 12) {
            Image("Logo")
                .resizable()
                .frame(width: 56, height: 56)
                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                .accessibilityHidden(true)
            Text("Connexion")
                .font(.system(.largeTitle, design: .rounded, weight: .bold))
                .foregroundStyle(Theme.textPrimary)
            Text("Utilise tes identifiants Lise habituels.")
                .foregroundStyle(Theme.textSecondary)
        }
    }

    private var form: some View {
        VStack(spacing: 0) {
            TextField("Identifiant (20xx-xxxx)", text: $username)
                .textContentType(.username)
                .keyboardType(.numbersAndPunctuation)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .focused($focusedField, equals: .username)
                .submitLabel(.next)
                .onSubmit { focusedField = .password }
                .padding(16)
            Divider().padding(.leading, 16)
            SecureField("Mot de passe", text: $password)
                .textContentType(.password)
                .focused($focusedField, equals: .password)
                .submitLabel(.go)
                .onSubmit(submit)
                .padding(16)
            Divider().padding(.leading, 16)
            Toggle("Rester connecté", isOn: $remember)
                .tint(Theme.primary)
                .padding(16)
        }
        .background(Theme.backgroundPrimary, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
    }

    private var submitButton: some View {
        Button(action: submit) {
            HStack {
                if isSubmitting { ProgressView().tint(Theme.onPrimary) }
                Text(isSubmitting ? "Connexion à Lise…" : "Se connecter")
                    .fontWeight(.semibold)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
        }
        .foregroundStyle(Theme.onPrimary)
        .background(Theme.primary.opacity(canSubmit ? 1 : 0.4), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        .disabled(!canSubmit)
        .sensoryFeedback(.error, trigger: errorMessage) { _, new in new != nil }
    }

    private func submit() {
        guard canSubmit else { return }
        isSubmitting = true
        errorMessage = nil

        Task {
            defer { isSubmitting = false }
            do {
                try await session.signIn(username: username, password: password, remember: remember)
                if !settings.hasValidLiseId { settings.liseId = username }
                dismiss()
            } catch {
                errorMessage = error.localizedDescription
            }
        }
    }
}
