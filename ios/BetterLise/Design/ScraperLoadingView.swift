import SwiftUI

/// Native port of the web app's Lise loading animation (components/ui/LoadingBar.tsx): an abstract
/// Lise page scanned by a laser while rows get "extracted", with a percentage and phase message.
struct ScraperLoadingView: View {
    let startedAt: Date
    let expectedDuration: TimeInterval
    let isFinished: Bool
    var slowNotice: String?

    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        TimelineView(.animation(minimumInterval: 1.0 / 30, paused: isFinished)) { context in
            let progress = isFinished
                ? 100
                : ScraperProgress(expectedDuration: expectedDuration).progress(elapsed: context.date.timeIntervalSince(startedAt))
            VStack(spacing: 24) {
                ScannedPage(progress: progress, reduceMotion: reduceMotion)
                ProgressReadout(progress: progress, isFinished: isFinished)
                Text(isFinished || progress >= 90 ? " " : (slowNotice ?? "Lise peut mettre quelques secondes à répondre."))
                    .font(.footnote)
                    .foregroundStyle(Theme.textTertiary)
                    .multilineTextAlignment(.center)
                    .animation(.easeInOut, value: progress >= 90)
            }
            .padding(32)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .accessibilityElement(children: .ignore)
            .accessibilityLabel(isFinished ? "Synchronisation terminée" : "Synchronisation avec Lise")
            .accessibilityValue(isFinished ? "" : "\(Int(progress)) %, \(ScraperProgress.message(for: progress))")
        }
    }
}

private struct ScannedPage: View {
    let progress: Double
    let reduceMotion: Bool

    private struct SkeletonRow {
        let threshold: Double
        let titleWidth: CGFloat
        let subtitleWidth: CGFloat
    }

    private let rows = [
        SkeletonRow(threshold: 0.15, titleWidth: 1.0, subtitleWidth: 0.4),
        SkeletonRow(threshold: 0.35, titleWidth: 0.85, subtitleWidth: 0.6),
        SkeletonRow(threshold: 0.55, titleWidth: 0.95, subtitleWidth: 0.3),
        SkeletonRow(threshold: 0.75, titleWidth: 0.8, subtitleWidth: 0.5),
    ]

    var body: some View {
        let scan = ScraperProgress.scanFraction(for: progress)
        VStack(spacing: 0) {
            browserChrome
            GeometryReader { geometry in
                ZStack(alignment: .topLeading) {
                    VStack(spacing: 0) {
                        ForEach(rows.indices, id: \.self) { index in
                            row(rows[index], isExtracted: scan > rows[index].threshold, width: geometry.size.width)
                            if index < rows.count - 1 { Spacer(minLength: 0) }
                        }
                    }
                    .padding(16)

                    laser(width: geometry.size.width)
                        .offset(y: geometry.size.height * scan - 24)
                        .opacity(progress < 15 || progress > 98 ? 0 : 1)
                        .animation(.easeInOut(duration: 0.3), value: progress < 15 || progress > 98)

                    connectingOverlay
                        .opacity(progress < 15 ? 1 : 0)
                        .animation(.easeOut(duration: 0.5), value: progress < 15)
                }
            }
        }
        .frame(width: 288, height: 192)
        .background(Theme.backgroundPrimary)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).stroke(Theme.gridLine.opacity(0.5), lineWidth: 1))
        .shadow(color: .black.opacity(0.08), radius: 20, y: 8)
    }

    private var browserChrome: some View {
        HStack(spacing: 6) {
            ForEach(0..<3, id: \.self) { _ in
                Circle().fill(Theme.textTertiary.opacity(0.2)).frame(width: 10, height: 10)
            }
            Spacer()
            Capsule().fill(Theme.textTertiary.opacity(0.1)).frame(width: 96, height: 8)
        }
        .padding(.horizontal, 12)
        .frame(height: 28)
        .background(Theme.backgroundSecondary)
    }

    private func row(_ row: SkeletonRow, isExtracted: Bool, width: CGFloat) -> some View {
        let textWidth = (width - 32) * 0.75
        return HStack {
            VStack(alignment: .leading, spacing: 6) {
                Capsule()
                    .fill(isExtracted ? Theme.textPrimary : Theme.backgroundSecondary)
                    .frame(width: textWidth * row.titleWidth, height: 10)
                Capsule()
                    .fill(isExtracted ? Theme.textTertiary : Theme.backgroundSecondary.opacity(0.6))
                    .frame(width: textWidth * row.subtitleWidth, height: 6)
            }
            Spacer(minLength: 8)
            RoundedRectangle(cornerRadius: 5, style: .continuous)
                .fill(isExtracted ? Theme.primary.opacity(0.12) : Theme.backgroundSecondary)
                .overlay {
                    RoundedRectangle(cornerRadius: 5, style: .continuous)
                        .stroke(Theme.primary.opacity(isExtracted ? 0.35 : 0), lineWidth: 1)
                }
                .overlay {
                    Capsule().fill(Theme.primary).frame(width: 12, height: 4)
                        .scaleEffect(isExtracted ? 1 : 0)
                }
                .frame(width: 32, height: 20)
                .scaleEffect(isExtracted ? 1 : 0.75)
                .opacity(isExtracted ? 1 : 0.5)
        }
        .animation(reduceMotion ? nil : .spring(duration: 0.5, bounce: 0.35), value: isExtracted)
    }

    private func laser(width: CGFloat) -> some View {
        ZStack(alignment: .trailing) {
            LinearGradient(colors: [.clear, Theme.primary.opacity(0.12), .clear], startPoint: .top, endPoint: .bottom)
            Rectangle()
                .fill(Theme.primary)
                .frame(height: 1)
                .shadow(color: Theme.primary.opacity(0.8), radius: 4)
                .frame(maxHeight: .infinity)
            Circle()
                .fill(Theme.primary)
                .frame(width: 6, height: 6)
                .padding(.trailing, 8)
                .phaseAnimator(reduceMotion ? [1.0] : [1.0, 0.3]) { dot, phase in
                    dot.opacity(phase)
                } animation: { _ in .easeInOut(duration: 0.6) }
        }
        .frame(width: width, height: 48)
        .allowsHitTesting(false)
    }

    private var connectingOverlay: some View {
        VStack(spacing: 8) {
            Image(systemName: "network")
                .font(.title2)
                .foregroundStyle(Theme.primary)
                .symbolEffect(.pulse, options: .repeating, isActive: !reduceMotion)
            Text("AUTH. LISE…")
                .font(.system(size: 10, weight: .medium, design: .monospaced))
                .tracking(2)
                .foregroundStyle(Theme.textTertiary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(.regularMaterial)
    }
}

private struct ProgressReadout: View {
    let progress: Double
    let isFinished: Bool

    var body: some View {
        VStack(spacing: 6) {
            HStack(alignment: .firstTextBaseline, spacing: 4) {
                Text("\(Int(progress))")
                    .font(.system(.largeTitle, design: .rounded, weight: .bold).monospacedDigit())
                    .foregroundStyle(Theme.textPrimary)
                    .contentTransition(.numericText(value: progress))
                    .animation(.snappy, value: Int(progress))
                Text("%")
                    .font(.subheadline.weight(.bold))
                    .foregroundStyle(Theme.textTertiary)
            }

            Group {
                if isFinished {
                    Label("Terminé", systemImage: "checkmark.circle.fill")
                        .foregroundStyle(Theme.primary)
                } else {
                    Text(ScraperProgress.message(for: progress))
                        .foregroundStyle(Theme.textSecondary)
                }
            }
            .font(.subheadline.weight(.medium))
            .id(isFinished ? "done" : ScraperProgress.message(for: progress))
            .transition(.push(from: .bottom).combined(with: .opacity))
            .animation(.smooth(duration: 0.3), value: isFinished ? "done" : ScraperProgress.message(for: progress))
        }
        .frame(height: 64)
    }
}

/// Compact variant floating above cached content while Lise syncs in the background.
struct SyncProgressPill: View {
    let startedAt: Date
    let expectedDuration: TimeInterval
    let isFinished: Bool

    var body: some View {
        TimelineView(.animation(minimumInterval: 1.0 / 15, paused: isFinished)) { context in
            let progress = isFinished
                ? 100
                : ScraperProgress(expectedDuration: expectedDuration).progress(elapsed: context.date.timeIntervalSince(startedAt))
            HStack(spacing: 10) {
                if isFinished {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundStyle(Theme.primary)
                        .transition(.scale.combined(with: .opacity))
                } else {
                    ProgressRing(fraction: progress / 100)
                }
                Text(isFinished ? "À jour" : ScraperProgress.message(for: progress))
                    .font(.footnote.weight(.medium))
                    .foregroundStyle(Theme.textSecondary)
                    .contentTransition(.opacity)
                if !isFinished {
                    Text("\(Int(progress)) %")
                        .font(.footnote.monospacedDigit().weight(.semibold))
                        .foregroundStyle(Theme.textTertiary)
                        .contentTransition(.numericText(value: progress))
                }
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 8)
            .background(.regularMaterial, in: Capsule())
            .shadow(color: .black.opacity(0.08), radius: 10, y: 4)
            .animation(.smooth, value: isFinished)
            .accessibilityElement(children: .combine)
        }
    }
}

private struct ProgressRing: View {
    let fraction: Double

    var body: some View {
        ZStack {
            Circle().stroke(Theme.primary.opacity(0.2), lineWidth: 2.5)
            Circle()
                .trim(from: 0, to: fraction)
                .stroke(Theme.primary, style: StrokeStyle(lineWidth: 2.5, lineCap: .round))
                .rotationEffect(.degrees(-90))
        }
        .frame(width: 16, height: 16)
    }
}
