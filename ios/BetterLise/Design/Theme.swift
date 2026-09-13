import SwiftUI

/// Palette ported from the web design tokens (styles/globals.css), light and dark.
enum Theme {
    static let primary = Color(light: 0x6750A4, dark: 0xD0BCFF)
    static let onPrimary = Color(light: 0xFFFFFF, dark: 0x381E72)
    static let primarySoft = Color(light: 0xF5F3FF, dark: 0x2D2541)
    static let backgroundPrimary = Color(light: 0xFFFFFF, dark: 0x1E1B22)
    static let backgroundSecondary = Color(light: 0xF3F4F6, dark: 0x28252D)
    static let backgroundTertiary = Color(light: 0xE5E7EB, dark: 0x333038)
    static let textPrimary = Color(light: 0x111827, dark: 0xFFFFFF)
    static let textSecondary = Color(light: 0x374151, dark: 0xE6E1E5)
    static let textTertiary = Color(light: 0x6B7280, dark: 0xC4C7C5)
    static let gridLine = Color(light: 0xD1D5DB, dark: 0x49454F)

    struct Badge {
        let background: Color
        let foreground: Color
    }

    static let success = Badge(background: Color(light: 0xDCFCE7, dark: 0x064E3B), foreground: Color(light: 0x14532D, dark: 0x6EE7B7))
    static let warning = Badge(background: Color(light: 0xFEF9C3, dark: 0x78350F), foreground: Color(light: 0xA16207, dark: 0xFCD34D))
    static let danger = Badge(background: Color(light: 0xFEE2E2, dark: 0x7F1D1D), foreground: Color(light: 0x991B1B, dark: 0xFCA5A5))
    static let neutral = Badge(background: Color(light: 0xF3F4F6, dark: 0x333038), foreground: Color(light: 0x374151, dark: 0xE6E1E5))

    static func eventColors(_ kind: EventKind) -> Badge {
        switch kind {
        case .lecture:
            Badge(background: Color(light: 0xFDE68A, dark: 0xB27C0E), foreground: Color(light: 0x854D0E, dark: 0xFFFFFF))
        case .exam:
            Badge(background: Color(light: 0xFCA5A5, dark: 0x9E2A2B), foreground: Color(light: 0x991B1B, dark: 0xFFFFFF))
        case .selfStudy, .project:
            Badge(background: Color(light: 0xCBD5E1, dark: 0x3D405B), foreground: Color(light: 0x1E293B, dark: 0xE0E1DD))
        case .practical:
            Badge(background: Color(light: 0x93C5FD, dark: 0x1D4E89), foreground: Color(light: 0x1E40AF, dark: 0xFFFFFF))
        case .restaurant:
            Badge(background: Color(light: 0xCFE8F5, dark: 0x4A4E69), foreground: Color(light: 0x0B5E8E, dark: 0xF2E9E4))
        case .tutorial, .other:
            Badge(background: Color(light: 0xC4B5FD, dark: 0x453375), foreground: Color(light: 0x5B21B6, dark: 0xFFFFFF))
        }
    }

    static func gradeBadge(_ note: Double) -> Badge {
        switch GradeSorting.tier(for: note) {
        case .failing: danger
        case .passing: warning
        case .good: success
        }
    }

    static func absenceBadge(_ percentage: Double) -> Badge {
        switch percentage {
        case 20...: danger
        case 10...: warning
        default: success
        }
    }
}

extension Color {
    init(light: UInt32, dark: UInt32) {
        self.init(uiColor: UIColor { traits in
            UIColor(hex: traits.userInterfaceStyle == .dark ? dark : light)
        })
    }
}

extension UIColor {
    convenience init(hex: UInt32) {
        self.init(
            red: CGFloat((hex >> 16) & 0xFF) / 255,
            green: CGFloat((hex >> 8) & 0xFF) / 255,
            blue: CGFloat(hex & 0xFF) / 255,
            alpha: 1
        )
    }
}

/// Rounded card surface used across screens.
struct CardBackground: ViewModifier {
    func body(content: Content) -> some View {
        content
            .padding(16)
            .background(Theme.backgroundPrimary, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
            .shadow(color: .black.opacity(0.05), radius: 12, y: 4)
    }
}

extension View {
    func card() -> some View { modifier(CardBackground()) }
}
