import Foundation

/// Saves each account's simulator changes on the device (the web keeps them in localStorage).
@MainActor
struct SimulatorStore {
    private static let keyPrefix = "simulator.v1."
    private let defaults: UserDefaults

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
    }

    func load(username: String) -> SimulatorData {
        guard let data = defaults.data(forKey: Self.keyPrefix + username),
              let decoded = try? JSONDecoder().decode(SimulatorData.self, from: data) else {
            return SimulatorData()
        }
        return decoded
    }

    func save(_ value: SimulatorData, username: String) {
        guard let data = try? JSONEncoder().encode(value) else { return }
        defaults.set(data, forKey: Self.keyPrefix + username)
    }

    func clearAll() {
        for key in defaults.dictionaryRepresentation().keys where key.hasPrefix(Self.keyPrefix) {
            defaults.removeObject(forKey: key)
        }
    }
}
