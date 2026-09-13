import XCTest

@MainActor
final class AgendaSwipeUITests: XCTestCase {
    private func launchApp(agendaDelay: Double = 0) -> XCUIApplication {
        continueAfterFailure = false
        let app = XCUIApplication()
        // Launch arguments populate UserDefaults: gives the agenda a Lise ID without going through Settings,
        // and the DEBUG stub API keeps the tests independent from any real backend
        app.launchArguments += [
            "-settings.liseId", "2023-1234",
            "-uiTestStubAPI", "YES",
            "-uiTestAgendaDelay", "\(agendaDelay)",
        ]
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
        let page = (0..<265).first { pageIsOnScreen($0, in: app) }.map(String.init) ?? "none"
        XCTFail("The highlighted day card is still \(previous) (page on screen: \(page))")
        return previous
    }

    /// A fast, strictly horizontal flick across most of the pager. `swipeLeft()` starts at the element center
    /// and is occasionally captured by the day's vertical scroll view, which made the tests flaky.
    private func flick(_ element: XCUIElement, towards direction: CGFloat) {
        let start = element.coordinate(withNormalizedOffset: CGVector(dx: direction < 0 ? 0.85 : 0.15, dy: 0.3))
        let end = element.coordinate(withNormalizedOffset: CGVector(dx: direction < 0 ? 0.15 : 0.85, dy: 0.3))
        start.press(forDuration: 0.05, thenDragTo: end, withVelocity: .fast, thenHoldForDuration: 0)
    }

    private func pageIsOnScreen(_ index: Int, in app: XCUIApplication) -> Bool {
        let page = app.scrollViews["dayPage-\(index)"]
        let screen = app.windows.firstMatch.frame
        return page.exists && abs(page.frame.minX - screen.minX) < 2
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

        flick(strip, towards: -1)

        let label = waitForSelectedLabel(in: app, differentFrom: initial)
        XCTAssertTrue(waitUntilOnScreen(selectedChip(in: app), in: app), "\(label) should be visible in the week strip")
    }

    func testSwipingDaysUpdatesTheHighlightedDayCard() {
        let app = launchApp()
        XCTAssertTrue(selectedChip(in: app).waitForExistence(timeout: 10))
        var label = selectedChip(in: app).label
        let pager = app.scrollViews["dayPager"]
        XCTAssertTrue(pager.waitForExistence(timeout: 5))
        // Let launch animations settle so the first swipe is not swallowed
        _ = app.buttons["Aujourd'hui"].waitForExistence(timeout: 1)
        XCTAssertTrue(waitUntilOnScreen(selectedChip(in: app), in: app))

        // Five swipes cross into the next week: the strip must follow
        for _ in 0..<6 {
            flick(pager, towards: -1)
            label = waitForSelectedLabel(in: app, differentFrom: label)
            XCTAssertTrue(waitUntilOnScreen(selectedChip(in: app), in: app), "\(label) should be visible in the week strip")
        }

        // Swiping back across the week boundary brings the previous week back too
        for _ in 0..<2 {
            flick(pager, towards: 1)
            label = waitForSelectedLabel(in: app, differentFrom: label)
            XCTAssertTrue(waitUntilOnScreen(selectedChip(in: app), in: app), "\(label) should be visible in the week strip")
        }
    }

    /// A swipe made while the agenda is still loading must survive the data arriving.
    func testSwipeIsKeptWhenTheAgendaFinishesLoading() {
        let app = launchApp(agendaDelay: 3)
        XCTAssertTrue(selectedChip(in: app).waitForExistence(timeout: 10))
        let initial = selectedChip(in: app).label
        let pager = app.scrollViews["dayPager"]

        flick(pager, towards: -1)
        let swiped = waitForSelectedLabel(in: app, differentFrom: initial)

        // Wait for the delayed agenda response, then make sure the pager did not jump back
        XCTAssertTrue(app.staticTexts["Mécanique"].waitForExistence(timeout: 8))
        RunLoop.current.run(until: Date().addingTimeInterval(1))
        XCTAssertEqual(selectedChip(in: app).label, swiped)
        let visible = (0..<265).first { pageIsOnScreen($0, in: app) }
        XCTAssertNotNil(visible, "A day page fills the screen")
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
