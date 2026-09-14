import Foundation
import Observation

enum Campus: String, CaseIterable, Identifiable, Sendable {
    case chalons = "Chalons", boquette = "Boquette", cluny = "Cluny", birse = "Birse"
    case p3 = "P3", kin = "KIN", bordels = "Bordels", sibers = "Sibers", rabat = "Rabat"

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .chalons: "Chalons"
        case .boquette: "Boquette"
        case .cluny: "Cluns"
        case .birse: "Birse"
        case .p3: "P3"
        case .kin: "KIN"
        case .bordels: "Bordels"
        case .sibers: "Sibers"
        case .rabat: "Rabat"
        }
    }
}

enum Promo: String, CaseIterable, Identifiable, Sendable {
    case gim1 = "GIM1", gim2 = "GIM2", gie1 = "GIE1", gie2 = "GIE2", exp = "EXP", other = "Autre"

    var id: String { rawValue }
}

/// Non-sensitive user preferences stored in UserDefaults.
@MainActor
@Observable
final class SettingsStore {
    private enum Keys {
        static let liseId = "settings.liseId"
        static let campus = "settings.campus"
        static let promo = "settings.promo"
        static let showRU = "settings.showRU"
        static let revealMode = "settings.revealMode"
    }

    private let defaults: UserDefaults

    var liseId: String {
        didSet { defaults.set(liseId, forKey: Keys.liseId) }
    }

    var campus: Campus {
        didSet { defaults.set(campus.rawValue, forKey: Keys.campus) }
    }

    var promo: Promo? {
        didSet { defaults.set(promo?.rawValue, forKey: Keys.promo) }
    }

    var showRU: Bool {
        didSet { defaults.set(showRU, forKey: Keys.showRU) }
    }

    /// New grades are hidden behind an animated reveal. Off by default.
    var revealMode: Bool {
        didSet { defaults.set(revealMode, forKey: Keys.revealMode) }
    }

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
        liseId = defaults.string(forKey: Keys.liseId) ?? ""
        campus = defaults.string(forKey: Keys.campus).flatMap(Campus.init(rawValue:)) ?? .sibers
        promo = defaults.string(forKey: Keys.promo).flatMap(Promo.init(rawValue:))
        showRU = defaults.object(forKey: Keys.showRU) as? Bool ?? true
        revealMode = defaults.bool(forKey: Keys.revealMode)
    }

    var hasValidLiseId: Bool { LiseID.isValid(liseId) }
}

enum LiseID {
    static func isValid(_ value: String) -> Bool {
        value.wholeMatch(of: /\d{4}-\d{4}/) != nil
    }
}
