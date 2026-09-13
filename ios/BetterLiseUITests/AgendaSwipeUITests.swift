import XCTest

@MainActor
final class AgendaSwipeUITests: XCTestCase {
    private func launchApp() -> XCUIApplication {
        continueAfterFailure = false
        let app = XCUIApplication()
        // Launch arguments populate UserDefaults: gives the agenda a Lise ID without going through Settings
        app.launchArguments += ["-settings.liseId", "2023-1234"]
        app.launch()
        return app
    }

    private func selectedChip(in app: XCUIApplication) -> XCUIElement {
        app.buttons.matching(NSPredicate(format: "identifier == 'dayChip' AND selected == true")).firstMatch
    }

    private func waitForSelectedLabel(in app: XCUIApplication, differentFrom previous: String) -> String {
        let deadline = Date().addingTimeInterval(3)
        while Date() < deadline {
            let chip = selectedChip(in: app)
            if chip.exists, chip.label != previous { return chip.label }
            RunLoop.current.run(until: Date().addingTimeInterval(0.1))
        }
        XCTFail("The highlighted day card is still \(previous)")
        return previous
    }

    private func waitUntilOnScreen(_ element: XCUIElement, in app: XCUIApplication) -> Bool {
        let deadline = Date().addingTimeInterval(3)
        while Date() < deadline {
            if element.exists, app.windows.firstMatch.frame.contains(element.frame) { return true }
            RunLoop.current.run(until: Date().addingTimeInterval(0.1))
        }
        return false
    }

    func testSwipingTheWeekStripMovesTheCalendar() {
        let app = launchApp()
        XCTAssertTrue(selectedChip(in: app).waitForExistence(timeout: 10))
        let initial = selectedChip(in: app).label
        let strip = app.scrollViews["weekStrip"]

        strip.swipeLeft()

        let label = waitForSelectedLabel(in: app, differentFrom: initial)
        XCTAssertTrue(waitUntilOnScreen(selectedChip(in: app), in: app), "\(label) should be visible in the week strip")
    }

    func testSwipingDaysUpdatesTheHighlightedDayCard() {
        let app = launchApp()
        XCTAssertTrue(selectedChip(in: app).waitForExistence(timeout: 10))
        var label = selectedChip(in: app).label
        let pager = app.scrollViews["dayPager"]
        XCTAssertTrue(pager.waitForExistence(timeout: 5))

        // Five swipes cross into the next week: the strip must follow
        for _ in 0..<6 {
            pager.swipeLeft()
            label = waitForSelectedLabel(in: app, differentFrom: label)
            XCTAssertTrue(waitUntilOnScreen(selectedChip(in: app), in: app), "\(label) should be visible in the week strip")
        }

        // Swiping back across the week boundary brings the previous week back too
        for _ in 0..<2 {
            pager.swipeRight()
            label = waitForSelectedLabel(in: app, differentFrom: label)
            XCTAssertTrue(waitUntilOnScreen(selectedChip(in: app), in: app), "\(label) should be visible in the week strip")
        }
    }

    func testTappingADayCardMovesThePager() {
        let app = launchApp()
        XCTAssertTrue(selectedChip(in: app).waitForExistence(timeout: 10))
        let initial = selectedChip(in: app).label
        let screen = app.windows.firstMatch.frame
        let other = app.buttons.matching(NSPredicate(format: "identifier == 'dayChip' AND selected == false"))
            .allElementsBoundByIndex
            .first { screen.contains($0.frame) }!
        let target = other.label
        other.tap()
        XCTAssertEqual(waitForSelectedLabel(in: app, differentFrom: initial), target)
    }
}
