import Testing
@testable import BetterLise

struct CoefficientInputTests {
    @Test(arguments: [("1,33", 1.33), (" 1.33 ", 1.33), ("0,25", 0.25), ("100", 100.0)])
    func acceptsDecimalsWithCommaOrDot(text: String, expected: Double) {
        #expect(CoefficientInput.parse(text) == expected)
    }

    @Test(arguments: ["", "abc", "0", "-1", "100,01", "1,2,3", "nan", "inf"])
    func rejectsUnusableCoefficients(text: String) {
        #expect(CoefficientInput.parse(text) == nil)
    }

    @Test func steppingKeepsHundredthsAndStaysInRange() {
        #expect(CoefficientInput.stepped(1.33, by: CoefficientInput.step) == 1.83)
        #expect(CoefficientInput.stepped(1.33, by: -CoefficientInput.step) == 0.83)
        #expect(CoefficientInput.stepped(0.33, by: -CoefficientInput.step) == 0.33)
        #expect(CoefficientInput.stepped(100, by: CoefficientInput.step) == 100)
        #expect(CoefficientInput.stepped(nil, by: CoefficientInput.step) == 1.5)
    }

    @Test func formatsInFrench() {
        #expect(CoefficientInput.format(1.33) == "1,33")
        #expect(CoefficientInput.format(2) == "2")
    }
}
