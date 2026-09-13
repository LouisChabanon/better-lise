import XCTest

@MainActor
final class CasinoModeUITests: XCTestCase {
    private func launchApp() -> XCUIApplication {
        continueAfterFailure = false
        let app = XCUIApplication()
        app.launchArguments += [
            "-uiTestStubAPI", "YES", // DEBUG-only canned API with a signed-in session
            "-settings.liseId", "2023-1234",
            "-settings.casinoMode", "YES",
            "-lootBoxRollDuration", "1.5",
        ]
        app.launch()
        return app
    }



    func testNewGradeIsRevealedThroughTheLootbox() {
        let app = launchApp()
        app.tabBars.buttons["Notes"].tap()

        let hidden = app.buttons.matching(identifier: "hiddenGrade").firstMatch
        XCTAssertTrue(hidden.waitForExistence(timeout: 10), "New grades hide their note in casino mode")
        hidden.tap()

        let open = app.buttons["Voir la note"]
        XCTAssertTrue(open.waitForExistence(timeout: 5))
        open.tap()

        XCTAssertTrue(app.staticTexts["LEGENDARY"].waitForExistence(timeout: 6), "The rarity is announced on reveal")
        XCTAssertTrue(app.staticTexts["Moyenne"].waitForExistence(timeout: 8), "The grade detail opens after the reveal")

        let replay = app.buttons["Marquer comme nouvelle"]
        XCTAssertTrue(replay.waitForExistence(timeout: 3))
        replay.tap()
        XCTAssertTrue(hidden.waitForExistence(timeout: 5), "Replay hides the grade again")
    }
}
