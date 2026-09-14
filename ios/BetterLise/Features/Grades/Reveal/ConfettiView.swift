import SwiftUI
import UIKit

/// Confetti bursts from the left and right thirds of the screen, fading over 3 s (like the web
/// `canvas-confetti` effect). Particles are drawn by Core Animation.
struct ConfettiView: UIViewRepresentable {
    static let duration: TimeInterval = 3

    func makeUIView(context: Context) -> ConfettiEmitterView {
        ConfettiEmitterView()
    }

    func updateUIView(_ uiView: ConfettiEmitterView, context: Context) {}
}

final class ConfettiEmitterView: UIView {
    private let emitters = [CAEmitterLayer(), CAEmitterLayer()]
    private static let colors: [UIColor] = [0xFFB900, 0xA800B7, 0x155DFC, 0x22C55E, 0xF43F5E, 0x6750A4].map(UIColor.init(hex:))

    override init(frame: CGRect) {
        super.init(frame: frame)
        isUserInteractionEnabled = false
        backgroundColor = .clear
        for emitter in emitters {
            emitter.emitterShape = .point
            emitter.emitterCells = Self.colors.map(Self.cell)
            emitter.beginTime = CACurrentMediaTime()
            layer.addSublayer(emitter)
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + ConfettiView.duration) { [weak self] in
            self?.emitters.forEach { $0.birthRate = 0 }
        }
    }

    required init?(coder: NSCoder) { nil }

    override func layoutSubviews() {
        super.layoutSubviews()
        emitters[0].emitterPosition = CGPoint(x: bounds.width * 0.2, y: bounds.height * 0.25)
        emitters[1].emitterPosition = CGPoint(x: bounds.width * 0.8, y: bounds.height * 0.25)
        emitters.forEach { $0.frame = bounds }
    }

    private static func cell(color: UIColor) -> CAEmitterCell {
        let cell = CAEmitterCell()
        let image = Self.particleImage(color: color)
        cell.contents = image.cgImage
        cell.contentsScale = image.scale
        cell.birthRate = 14
        cell.lifetime = 3
        cell.velocity = 320
        cell.velocityRange = 140
        cell.emissionRange = .pi * 2
        cell.yAcceleration = 420
        cell.spin = 3
        cell.spinRange = 6
        cell.scale = 0.9
        cell.scaleRange = 0.4
        cell.alphaSpeed = -0.35
        return cell
    }

    private static func particleImage(color: UIColor) -> UIImage {
        UIGraphicsImageRenderer(size: CGSize(width: 10, height: 6)).image { context in
            color.setFill()
            context.fill(CGRect(x: 0, y: 0, width: 10, height: 6))
        }
    }
}
