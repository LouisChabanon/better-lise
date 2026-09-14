import Foundation
import Testing
@testable import BetterLise

@MainActor
struct GradeRevealSoundTests {
    @Test func decodesTheBundledSoundsOnce() {
        let sound = GradeRevealSound()
        #expect(sound.loadedSoundCount == 3)
    }

    @Test func tickPlaybackNeverBlocksTheCaller() {
        let sound = GradeRevealSound()
        let start = Date()
        for _ in 0..<100 { sound.playTick() }
        // Scheduling happens on a background queue: 100 calls must be near-instant for the main thread
        #expect(Date().timeIntervalSince(start) < 0.05)
    }
}
