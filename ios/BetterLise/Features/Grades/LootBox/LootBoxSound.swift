import AVFoundation

/// The web lootbox sounds. Uses the ambient session: silent when the ring/silent switch is on,
/// and mixed with whatever is already playing.
@MainActor
final class LootBoxSound {
    private let open: AVAudioPlayer?
    private let reveal: AVAudioPlayer?
    /// Ticks overlap while the reel is fast, so a few players rotate.
    private let ticks: [AVAudioPlayer]
    private var nextTick = 0

    init() {
        try? AVAudioSession.sharedInstance().setCategory(.ambient, options: [.mixWithOthers])
        open = Self.player("crate_open", volume: 0.3)
        reveal = Self.player("item_reveal", volume: 0.3)
        ticks = (0..<4).compactMap { _ in Self.player("crate_item_scroll", volume: 0.2) }
    }

    func playOpen() { play(open) }
    func playReveal() { play(reveal) }

    func playTick() {
        guard !ticks.isEmpty else { return }
        play(ticks[nextTick])
        nextTick = (nextTick + 1) % ticks.count
    }

    private func play(_ player: AVAudioPlayer?) {
        guard let player else { return }
        player.currentTime = 0
        player.play()
    }

    private static func player(_ name: String, volume: Float) -> AVAudioPlayer? {
        guard let url = Bundle.main.url(forResource: name, withExtension: "m4a"),
              let player = try? AVAudioPlayer(contentsOf: url) else { return nil }
        player.volume = volume
        player.prepareToPlay()
        return player
    }
}
