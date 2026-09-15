import XCTest

@MainActor
final class SimulatorUITests: XCTestCase {
    private func launchApp() -> XCUIApplication {
        continueAfterFailure = false
        let app = XCUIApplication()
        app.launchArguments += [
            "-uiTestStubAPI", "YES", // DEBUG-only canned API with a signed-in session
            "-settings.liseId", "2023-1234",
            "-settings.revealMode", "NO",
            "-simulator.helpDismissed", "YES",
        ]
        app.launch()
        return app
    }

    func testSimulatedGradeProjectsTheAverage() {
        let app = launchApp()
        app.selectTab("Notes")

        let averages = app.segmentedControls.buttons["Moyennes"]
        XCTAssertTrue(averages.waitForExistence(timeout: 10))
        XCTAssertTrue(averages.tap(until: app.staticTexts["MOYENNE"]), "Real grades are grouped with their average")
        XCTAssertFalse(app.staticTexts["projectionDelta"].exists, "No projection before any simulation")

        let confirm = app.buttons["confirmSimulation"]
        XCTAssertTrue(app.buttons["addSimulation"].tap(until: confirm))
        XCTAssertTrue(confirm.tap(until: app.staticTexts["projectionDelta"]), "The simulation projects a new average")
    }
}
