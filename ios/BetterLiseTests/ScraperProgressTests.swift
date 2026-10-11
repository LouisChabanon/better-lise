import Foundation
import Testing
@testable import BetterLise

struct ScraperProgressTests {
    let estimator = ScraperProgress(expectedDuration: 12)

    @Test func startsLowAndNeverReachesOneHundredOnItsOwn() {
        #expect(estimator.progress(elapsed: 0) == 5)
        #expect(estimator.progress(elapsed: -3) == 5)
        #expect(estimator.progress(elapsed: 10_000) <= 99)
    }

    @Test func isMonotonicAndCalibratedOnTheExpectedDuration() {
        let samples = stride(from: 0.0, through: 60, by: 0.5).map(estimator.progress(elapsed:))
        #expect(zip(samples, samples.dropFirst()).allSatisfy { $0 <= $1 })

        let atExpected = estimator.progress(elapsed: 12)
        #expect((85...93).contains(atExpected))
        #expect(estimator.progress(elapsed: 3) < 60)
    }

    @Test(arguments: [
        (0.0, "Initialisation..."),
        (9.9, "Initialisation..."),
        (10, "Préparation de la requête..."),
        (40, "Connexion à LISE..."),
        (74, "Récupération des données..."),
        (95, "Finalisation de l'analyse..."),
    ])
    func messagesFollowTheWebPhases(progress: Double, message: String) {
        #expect(ScraperProgress.message(for: progress) == message)
    }

    @Test func scanSpansTheWholeEasedRange() {
        #expect(ScraperProgress.scanFraction(for: 5) == 0)
        #expect(ScraperProgress.scanFraction(for: 52.5) == 0.5)
        #expect(ScraperProgress.scanFraction(for: 95) == 1)
        #expect(ScraperProgress.scanFraction(for: 99) == 1)
    }

    @Test func expectedDurationComesFromRecentLiseHealth() {
        #expect(LiseHealthMonitor.expectedDuration(for: nil) == LiseHealthMonitor.defaultDuration)
        #expect(LiseHealthMonitor.expectedDuration(for: LiseHealth(avgDuration: 25_000, count: 2)) == LiseHealthMonitor.defaultDuration)
        #expect(LiseHealthMonitor.expectedDuration(for: LiseHealth(avgDuration: 25_000, count: 12)) == 25)
        #expect(LiseHealthMonitor.expectedDuration(for: LiseHealth(avgDuration: 500, count: 12)) == 3)
        #expect(LiseHealthMonitor.expectedDuration(for: LiseHealth(avgDuration: 400_000, count: 12)) == 60)
    }

    @Test func warnsOnlyWhenLiseIsReliablySlow() {
        #expect(LiseHealthMonitor.slowNotice(for: LiseHealth(avgDuration: 8_000, count: 12)) == nil)
        #expect(LiseHealthMonitor.slowNotice(for: LiseHealth(avgDuration: 30_000, count: 2)) == nil)
        #expect(LiseHealthMonitor.slowNotice(for: LiseHealth(avgDuration: 22_400, count: 12)) == "Lise est lente en ce moment (≈ 22 s par synchronisation).")
    }
}
