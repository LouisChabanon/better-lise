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

    /// Labels of the day headers fully on screen, i.e. the week currently shown.
    /// Reads one snapshot of the hierarchy: querying each header separately takes seconds per week.
    private func visibleHeaders(in app: XCUIApplication) -> [String] {
        guard let root = try? app.snapshot() else { return [] }
        let screen = root.frame
        var headers: [(x: CGFloat, label: String)] = []
        var pending = [root]
        while let element = pending.popLast() {
            if element.identifier == "dayHeader", screen.contains(element.frame) {
                headers.append((element.frame.minX, element.label))
            }
            pending += element.children
        }
        return headers.sorted { $0.x < $1.x }.map(\.label)
    }

    private func waitForVisibleWeek(
        in app: XCUIApplication,
        differentFrom previous: [String],
        timeout: TimeInterval = 3
    ) -> [String] {
        let deadline = Date().addingTimeInterval(timeout)
        while Date() < deadline {
            let headers = visibleHeaders(in: app)
            if headers.count == 5, headers != previous { return headers }
            RunLoop.current.run(until: Date().addingTimeInterval(0.1))
        }
        XCTFail("The visible week is still \(previous)")
        return previous
    }

    private func waitForFullWeek(in app: XCUIApplication) -> [String] {
        let deadline = Date().addingTimeInterval(10)
        while Date() < deadline {
            let headers = visibleHeaders(in: app)
            if headers.count == 5 { return headers }
            RunLoop.current.run(until: Date().addingTimeInterval(0.1))
        }
        XCTFail("Five day headers should be on screen")
        return []
    }

    /// A fast, strictly horizontal flick across most of the pager. `swipeLeft()` starts at the element center
    /// and is occasionally captured by the week's vertical scroll view, which made the tests flaky.
    private func flick(_ element: XCUIElement, towards direction: CGFloat) {
        let start = element.coordinate(withNormalizedOffset: CGVector(dx: direction < 0 ? 0.85 : 0.15, dy: 0.3))
        let end = element.coordinate(withNormalizedOffset: CGVector(dx: direction < 0 ? 0.15 : 0.85, dy: 0.3))
        start.press(forDuration: 0.05, thenDragTo: end, withVelocity: .fast, thenHoldForDuration: 0)
    }

    func testOpensOnTheWholeCurrentWeek() {
        let app = launchApp()

        let headers = waitForFullWeek(in: app)

        XCTAssertEqual(headers.count, 5)
        let today = app.otherElements.matching(NSPredicate(format: "identifier == 'dayHeader' AND selected == true"))
        // On weekends the app opens on the upcoming week, where no day is today
        let weekday = Calendar.current.component(.weekday, from: Date())
        if (2...6).contains(weekday) {
            XCTAssertTrue(today.firstMatch.exists, "Today is highlighted")
        }
        XCTAssertFalse(app.buttons["Aujourd'hui"].exists)
    }

    func testSwipingChangesTheWeekAndTodayBringsItBack() {
        let app = launchApp()
        let initial = waitForFullWeek(in: app)
        let pager = app.scrollViews["weekPager"]

        flick(pager, towards: -1)
        let next = waitForVisibleWeek(in: app, differentFrom: initial)
        XCTAssertNotEqual(next, initial)
        XCTAssertTrue(app.buttons["Aujourd'hui"].waitForExistence(timeout: 2))

        flick(pager, towards: -1)
        _ = waitForVisibleWeek(in: app, differentFrom: next)

        app.buttons["Aujourd'hui"].tap()
        let deadline = Date().addingTimeInterval(3)
        while visibleHeaders(in: app) != initial, Date() < deadline {
            RunLoop.current.run(until: Date().addingTimeInterval(0.1))
        }
        XCTAssertEqual(visibleHeaders(in: app), initial)
    }

    /// A swipe made while the agenda is still loading must survive the data arriving.
    func testSwipeIsKeptWhenTheAgendaFinishesLoading() {
        let app = launchApp(agendaDelay: 5)
        let initial = waitForFullWeek(in: app)

        flick(app.scrollViews["weekPager"], towards: -1)
        let swiped = waitForVisibleWeek(in: app, differentFrom: initial)

        // Wait for the delayed agenda response, then make sure the pager did not jump back
        XCTAssertTrue(app.buttons.matching(identifier: "eventBlock").firstMatch.waitForExistence(timeout: 10))
        RunLoop.current.run(until: Date().addingTimeInterval(1))
        XCTAssertEqual(visibleHeaders(in: app), swiped)
    }

    func testTappingAnEventOpensItsDetails() {
        let app = launchApp()
        _ = waitForFullWeek(in: app)
        let screen = app.windows.firstMatch.frame
        let block = app.buttons.matching(identifier: "eventBlock").allElementsBoundByIndex
            .first { screen.contains($0.frame) }

        guard let block else { return XCTFail("An event of the current week is on screen") }
        let title = block.label.components(separatedBy: ",").first ?? block.label
        block.tap()

        XCTAssertTrue(app.staticTexts[title].waitForExistence(timeout: 3))
    }
}
