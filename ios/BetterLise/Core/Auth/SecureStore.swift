import Foundation
import Security

protocol SecureStore: AnyObject {
    func string(for key: String) -> String?
    func set(_ value: String, for key: String)
    func remove(_ key: String)
}

/// Keychain-backed storage, restricted to this device and available after first unlock.
final class KeychainStore: SecureStore {
    private let service: String

    init(service: String = Bundle.main.bundleIdentifier ?? "com.betterlise.app") {
        self.service = service
    }

    func string(for key: String) -> String? {
        var query = baseQuery(for: key)
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne

        var result: AnyObject?
        guard SecItemCopyMatching(query as CFDictionary, &result) == errSecSuccess,
              let data = result as? Data else {
            return nil
        }
        return String(data: data, encoding: .utf8)
    }

    func set(_ value: String, for key: String) {
        let data = Data(value.utf8)
        let attributes: [String: Any] = [
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly,
        ]
        let status = SecItemUpdate(baseQuery(for: key) as CFDictionary, attributes as CFDictionary)
        if status == errSecItemNotFound {
            let insert = baseQuery(for: key).merging(attributes) { _, new in new }
            SecItemAdd(insert as CFDictionary, nil)
        }
    }

    func remove(_ key: String) {
        SecItemDelete(baseQuery(for: key) as CFDictionary)
    }

    private func baseQuery(for key: String) -> [String: Any] {
        [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
        ]
    }
}

final class InMemorySecureStore: SecureStore {
    private var values: [String: String] = [:]

    func string(for key: String) -> String? { values[key] }
    func set(_ value: String, for key: String) { values[key] = value }
    func remove(_ key: String) { values[key] = nil }
}
