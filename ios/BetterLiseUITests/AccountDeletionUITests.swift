import XCTest

@MainActor
final class AccountDeletionUITests: XCTestCase {
    func testDeletingTheAccountExplainsLiseIsKeptThenSignsOut() {
        continueAfterFailure = false
        let app = XCUIApplication()
        app.launchArguments += ["-uiTestStubAPI", "YES", "-settings.liseId", "2023-1234"]
        app.launch()
        app.tabBars.buttons["Réglages"].tap()

        let delete = app.buttons["deleteAccount"]
        XCTAssertTrue(delete.waitForExistence(timeout: 5))
        delete.tap()

        let alert = app.alerts["Supprimer ton compte Better Lise ?"]
        XCTAssertTrue(alert.waitForExistence(timeout: 3))
        let explainsLiseIsKept = alert.staticTexts.containing(NSPredicate(format: "label CONTAINS %@", "ne supprime pas ton compte Lise")).firstMatch
        XCTAssertTrue(explainsLiseIsKept.exists, "The confirmation states the Lise account is not deleted")
        alert.buttons["Supprimer"].tap()

        XCTAssertTrue(app.buttons["Se connecter avec Lise"].waitForExistence(timeout: 10), "Deleting signs the user out")
        XCTAssertTrue(app.staticTexts["Ton compte Better Lise a été supprimé. Ton compte Lise de l’ENSAM reste inchangé."].exists)
        XCTAssertFalse(app.buttons["deleteAccount"].exists)
    }
}
