import AVFoundation

/// The web lootbox sounds, played through an `AVAudioEngine` whose scheduling happens on a background
/// queue: triggering a sound never blocks the main thread (and so never costs an animation frame).
/// Uses the ambient session: silent when the ring/silent switch is on, mixed with other audio.
final class LootBoxSound: @unchecked Sendable {
    private enum Sound: CaseIterable {
        case open, tick, reveal

        var resource: String {
            switch self {
            case .open: "crate_open"
            case .tick: "crate_item_scroll"
            case .reveal: "item_reveal"
            }
        }

        var volume: Float {
            switch self {
            case .tick: 0.2
            case .open, .reveal: 0.3
            }
        }
    }

    private let queue = DispatchQueue(label: "com.betterlise.lootbox.sound", qos: .userInteractive)
    private let engine = AVAudioEngine()
    private var buffers: [Sound: AVAudioPCMBuffer] = [:]
    private var nodes: [Sound: [AVAudioPlayerNode]] = [:]
    private var nextTickNode = 0

    /// Number of sounds decoded from the bundle (exposed for tests).
    private(set) var loadedSoundCount = 0

    init() {
        try? AVAudioSession.sharedInstance().setCategory(.ambient, options: [.mixWithOthers])
        for sound in Sound.allCases {
            guard let buffer = Self.decode(sound.resource) else { continue }
            buffers[sound] = buffer
            // Ticks overlap while the reel is fast, so they rotate through a few player nodes
            let count = sound == .tick ? 3 : 1
            nodes[sound] = (0..<count).map { _ in
                let node = AVAudioPlayerNode()
                engine.attach(node)
                engine.connect(node, to: engine.mainMixerNode, format: buffer.format)
                node.volume = sound.volume
                return node
            }
        }
        loadedSoundCount = buffers.count
        queue.async { [engine] in
            engine.prepare()
            try? engine.start()
        }
    }

    deinit {
        engine.stop()
    }

    func playOpen() { play(.open) }
    func playTick() { play(.tick) }
    func playReveal() { play(.reveal) }

    private func play(_ sound: Sound) {
        queue.async { [self] in
            guard let buffer = buffers[sound], let pool = nodes[sound], !pool.isEmpty else { return }
            // The engine stops on route changes or interruptions: restart it lazily
            if !engine.isRunning { try? engine.start() }
            guard engine.isRunning else { return }

            let node: AVAudioPlayerNode
            if sound == .tick {
                node = pool[nextTickNode]
                nextTickNode = (nextTickNode + 1) % pool.count
            } else {
                node = pool[0]
            }
            node.stop()
            node.scheduleBuffer(buffer, at: nil, options: [])
            node.play()
        }
    }

    private static func decode(_ name: String) -> AVAudioPCMBuffer? {
        guard let url = Bundle.main.url(forResource: name, withExtension: "m4a"),
              let file = try? AVAudioFile(forReading: url),
              let buffer = AVAudioPCMBuffer(pcmFormat: file.processingFormat, frameCapacity: AVAudioFrameCount(file.length)),
              (try? file.read(into: buffer)) != nil else { return nil }
        return buffer
    }
}
