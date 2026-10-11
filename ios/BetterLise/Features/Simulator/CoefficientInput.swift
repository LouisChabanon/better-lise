import Foundation

/// Free-form coefficients (e.g. 1,33): Savoir's weights are rarely multiples of 0,5.
enum CoefficientInput {
    /// The API refuses shared coefficients above this.
    static let maximum = 100.0
    static let step = 0.5

    /// Accepts a comma or a dot as decimal separator; nil when not a usable coefficient.
    static func parse(_ text: String) -> Double? {
        let normalized = text.trimmingCharacters(in: .whitespaces).replacingOccurrences(of: ",", with: ".")
        guard let value = Double(normalized), isValid(value) else { return nil }
        return value
    }

    static func format(_ value: Double) -> String {
        GradeFormat.note(value)
    }

    static func isValid(_ value: Double) -> Bool {
        value.isFinite && value > 0 && value <= maximum
    }

    /// − / + buttons: moves by `step`, rounded to hundredths, never reaching 0 or passing the maximum.
    static func stepped(_ value: Double?, by delta: Double) -> Double {
        let current = value ?? 1
        let next = ((current + delta) * 100).rounded() / 100
        return isValid(next) ? next : current
    }
}
