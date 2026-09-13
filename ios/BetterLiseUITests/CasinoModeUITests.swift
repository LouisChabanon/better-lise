import XCTest

@MainActor
final class CasinoModeUITests: XCTestCase {
    private func launchApp() -> XCUIApplication {
        continueAfterFailure = false
        let app = XCUIApplication()
        // Real 8 s roll on purpose: the re-roll-after-reveal regression did not show with a shortened roll
        app.launchArguments += [
            "-uiTestStubAPI", "YES", // DEBUG-only canned API with a signed-in session
            "-settings.liseId", "2023-1234",
            "-settings.casinoMode", "YES",
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

        XCTAssertTrue(app.staticTexts["LEGENDARY"].waitForExistence(timeout: 14), "The rarity is announced on reveal")
        // The reel lands on the real grade, and stays landed: the glow starting after the reveal used to
        // rebuild the reel, which rolled again
        let reel = app.otherElements["reel"]
        XCTAssertTrue(reel.waitForExistence(timeout: 3))
        XCTAssertEqual(reel.value as? String, "Arrêtée sur 18,50")
        RunLoop.current.run(until: Date().addingTimeInterval(1))
        XCTAssertEqual(reel.value as? String, "Arrêtée sur 18,50", "The reel must not roll again after the reveal")
        XCTAssertTrue(app.staticTexts["Moyenne"].waitForExistence(timeout: 8), "The grade detail opens after the reveal")

        let replay = app.buttons["Marquer comme nouvelle"]
        XCTAssertTrue(replay.waitForExistence(timeout: 3))
        replay.tap()
        XCTAssertTrue(hidden.waitForExistence(timeout: 5), "Replay hides the grade again")
    }
}
