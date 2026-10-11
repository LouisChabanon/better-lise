import XCTest

@MainActor
final class AchievementsUITests: XCTestCase {
    private func launchApp() -> XCUIApplication {
        continueAfterFailure = false
        let app = XCUIApplication()
        app.launchArguments += [
            "-uiTestStubAPI", "YES", // DEBUG-only canned API with a signed-in session
            "-settings.liseId", "2023-1234",
            "-settings.revealMode", "NO",
        ]
        app.launch()
        return app
    }

    func testTrophyOpensAchievementsWithLockedSecrets() {
        let app = launchApp()
        app.selectTab("Notes")

        let trophy = app.navigationBars.buttons["Succès"]
        XCTAssertTrue(trophy.waitForExistence(timeout: 10))
        let secret = app.buttons["achievement-SACQUE"]
        XCTAssertTrue(trophy.tap(until: secret))
        XCTAssertTrue(secret.label.contains("???"), "Locked secrets stay hidden")

        let snark = app.staticTexts["« Même l'archi Morel n'est pas autant un maxeur »"]
        XCTAssertTrue(app.buttons["achievement-DIEU_MATA"].tap(until: snark), "Unlocked achievements show their snark")
    }

    func testSettingsLinksToAchievementsAndLiseStatus() {
        let app = launchApp()
        app.selectTab("Réglages")

        let status = app.buttons["Statut de Lise"]
        XCTAssertTrue(app.navigationBars["Réglages"].waitForExistence(timeout: 5))
        for _ in 0..<4 where !status.exists { app.swipeUp() }
        XCTAssertTrue(status.waitForExistence(timeout: 5))
        XCTAssertTrue(status.tap(until: app.navigationBars["Statut de Lise"]))
        // The canned health payload predates the status field
        XCTAssertTrue(app.staticTexts["Données insuffisantes"].waitForExistence(timeout: 5))

        let achievements = app.buttons["Succès"]
        XCTAssertTrue(app.navigationBars.buttons.element(boundBy: 0).tap(until: app.navigationBars["Réglages"]))
        for _ in 0..<4 where !achievements.exists { app.swipeUp() }
        XCTAssertTrue(achievements.tap(until: app.buttons["achievement-FIRST_LOGIN"]))
    }
}
