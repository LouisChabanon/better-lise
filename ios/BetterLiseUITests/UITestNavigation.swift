import XCTest

// Under heavy load a tap sent while the app is still busy can be dropped, so these helpers
// retry until the tap visibly took effect.

extension XCUIApplication {
    /// Taps a tab until it is selected.
    func selectTab(_ label: String) {
        let tab = tabBars.buttons[label]
        _ = tab.waitForExistence(timeout: 10)
        let selected = NSPredicate(format: "isSelected == true")
        for _ in 0..<3 where !tab.isSelected {
            tab.tap()
            _ = XCTWaiter.wait(for: [XCTNSPredicateExpectation(predicate: selected, object: tab)], timeout: 3)
        }
    }
}

extension XCUIElement {
    /// Taps until `target` appears, returning whether it did.
    @discardableResult
    func tap(until target: XCUIElement, attempts: Int = 3, timeout: TimeInterval = 5) -> Bool {
        for _ in 0..<attempts {
            if exists { tap() }
            if target.waitForExistence(timeout: timeout) { return true }
        }
        return false
    }
}
