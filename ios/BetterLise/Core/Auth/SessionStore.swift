import Foundation
import Observation

/// Owns the Better Lise session: token, optional saved credentials and silent re-login.
@MainActor
@Observable
final class SessionStore {
    enum State: Equatable {
        case signedOut
        case signedIn(username: String)
    }

    private enum Keys {
        static let token = "session.token"
        static let username = "session.username"
        static let password = "session.password"
    }

    private(set) var state: State
    private let client: APIClient
    private let secureStore: SecureStore

    init(client: APIClient, secureStore: SecureStore) {
        self.client = client
        self.secureStore = secureStore
        if secureStore.string(for: Keys.token) != nil, let username = secureStore.string(for: Keys.username) {
            state = .signedIn(username: username)
        } else {
            state = .signedOut
        }
    }

    var username: String? {
        if case .signedIn(let username) = state { return username }
        return nil
    }

    var isSignedIn: Bool { username != nil }

    func signIn(username: String, password: String, remember: Bool) async throws {
        let response = try await client.send(Endpoints.login(username: username, password: password), token: nil)
        secureStore.set(response.token, for: Keys.token)
        secureStore.set(response.username, for: Keys.username)
        if remember {
            secureStore.set(password, for: Keys.password)
        } else {
            secureStore.remove(Keys.password)
        }
        state = .signedIn(username: response.username)
    }

    func signOut() async {
        if let token = secureStore.string(for: Keys.token) {
            _ = try? await client.send(Endpoints.logout(), token: token)
        }
        clearSession()
    }

    /// Sends an authenticated request. On an expired session, logs in again once
    /// with the saved credentials and retries; otherwise signs the user out.
    func send<T: Decodable>(_ endpoint: Endpoint<T>) async throws -> T {
        guard let token = secureStore.string(for: Keys.token) else {
            clearSession()
            throw APIError.unauthorized
        }

        do {
            return try await client.send(endpoint, token: token)
        } catch let error as APIError where error.requiresReauthentication {
            guard let newToken = await silentlyReauthenticate() else {
                clearSession()
                throw error
            }
            return try await client.send(endpoint, token: newToken)
        }
    }

    /// Public endpoints don't need a token.
    func sendPublic<T: Decodable>(_ endpoint: Endpoint<T>) async throws -> T {
        try await client.send(endpoint, token: nil)
    }

    private func silentlyReauthenticate() async -> String? {
        guard let username = secureStore.string(for: Keys.username),
              let password = secureStore.string(for: Keys.password) else {
            return nil
        }
        guard let response = try? await client.send(Endpoints.login(username: username, password: password), token: nil) else {
            return nil
        }
        secureStore.set(response.token, for: Keys.token)
        return response.token
    }

    private func clearSession() {
        secureStore.remove(Keys.token)
        secureStore.remove(Keys.password)
        secureStore.remove(Keys.username)
        state = .signedOut
    }
}
