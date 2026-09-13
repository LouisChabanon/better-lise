import SwiftUI

/// Loading state for screens backed by the API, with cached content support.
enum Loadable<Value: Equatable>: Equatable {
    case idle
    case loading(cached: Value?)
    case loaded(Value)
    case failed(message: String, cached: Value?)

    var value: Value? {
        switch self {
        case .idle: nil
        case .loading(let cached): cached
        case .loaded(let value): value
        case .failed(_, let cached): cached
        }
    }

    var isLoading: Bool {
        if case .loading = self { return true }
        return false
    }

    var errorMessage: String? {
        if case .failed(let message, _) = self { return message }
        return nil
    }
}

struct ErrorBanner: View {
    let message: String
    var retry: (() -> Void)?

    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 10) {
            Image(systemName: "exclamationmark.triangle.fill")
                .foregroundStyle(Theme.danger.foreground)
            Text(message)
                .font(.subheadline)
                .foregroundStyle(Theme.danger.foreground)
                .frame(maxWidth: .infinity, alignment: .leading)
            if let retry {
                Button("Réessayer", action: retry)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Theme.danger.foreground)
            }
        }
        .padding(12)
        .background(Theme.danger.background, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
        .accessibilityElement(children: .combine)
    }
}

struct SignInPrompt: View {
    let title: String
    let action: () -> Void

    var body: some View {
        ContentUnavailableView {
            Label("Connexion requise", systemImage: "lock.fill")
        } description: {
            Text("La page \(title) nécessite tes identifiants Lise.")
        } actions: {
            Button("Se connecter", action: action)
                .buttonStyle(.borderedProminent)
                .tint(Theme.primary)
        }
    }
}
