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
        let coeff = app.textFields["simulationCoeff"]
        XCTAssertTrue(coeff.waitForExistence(timeout: 5))
        coeff.tap()
        coeff.typeText(XCUIKeyboardKey.delete.rawValue + "1,33")
        XCTAssertTrue(app.staticTexts["Retrouvez les coefficients de vos épreuves sur Savoir (ex : 1,33)."].waitForExistence(timeout: 3), "1,33 is a valid coefficient")
        XCTAssertTrue(confirm.tap(until: app.staticTexts["projectionDelta"]), "The simulation projects a new average")
        XCTAssertTrue(app.staticTexts["coeff. 1,33"].exists, "The simulation keeps its decimal coefficient")
    }
}
