import Charts
import SwiftUI

/// How fast Lise answers right now and over the last 24 hours, measured by Better Lise syncs.
struct LiseHealthView: View {
    let monitor: LiseHealthMonitor
    @State private var errorMessage: String?
    @State private var isLoading = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                if let errorMessage {
                    ErrorBanner(message: errorMessage) { Task { await refresh() } }
                }
                if let health = monitor.health {
                    HealthStatusCard(health: health)
                    if let hourly = health.hourly, !hourly.isEmpty {
                        HealthHistoryCard(buckets: hourly)
                    }
                } else if isLoading {
                    ProgressView("Mesure en cours…")
                        .frame(maxWidth: .infinity, minHeight: 200)
                }
                Text("Ces mesures viennent des synchronisations de notes des utilisateurs de Better Lise : quand Lise est lente, elles le sont aussi.")
                    .font(.footnote)
                    .foregroundStyle(Theme.textTertiary)
            }
            .padding(16)
        }
        .background(Theme.backgroundSecondary.ignoresSafeArea())
        .navigationTitle("Statut de Lise")
        .refreshable { await refresh() }
        .task { await refresh() }
    }

    private func refresh() async {
        isLoading = true
        defer { isLoading = false }
        do {
            try await monitor.refresh()
            errorMessage = nil
        } catch {
            errorMessage = "Statut indisponible : \(error.localizedDescription)"
        }
    }
}

extension LiseHealthStatus {
    var label: String {
        switch self {
        case .unknown: "Données insuffisantes"
        case .ok: "Opérationnel"
        case .slow: "Lent"
        case .verySlow: "Très lent"
        }
    }

    var detail: String {
        switch self {
        case .unknown: "Pas assez de synchronisations ces deux dernières heures pour évaluer."
        case .ok: "Lise répond normalement."
        case .slow: "Temps de réponse supérieur à la normale."
        case .verySlow: "Le serveur Lise est très lent."
        }
    }

    var badge: Theme.Badge {
        switch self {
        case .unknown: Theme.neutral
        case .ok: Theme.success
        case .slow: Theme.warning
        case .verySlow: Theme.danger
        }
    }

    var symbol: String {
        switch self {
        case .unknown: "questionmark.circle.fill"
        case .ok: "bolt.fill"
        case .slow, .verySlow: "tortoise.fill"
        }
    }
}

private struct HealthStatusCard: View {
    let health: LiseHealth
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        let status = health.liseStatus
        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 12) {
                Image(systemName: status.symbol)
                    .font(.system(size: 22, weight: .bold))
                    .foregroundStyle(status.badge.foreground)
                    .frame(width: 48, height: 48)
                    .background(status.badge.background, in: Circle())
                    .symbolEffect(.pulse, options: .repeating, isActive: status != .ok && status != .unknown && !reduceMotion)
                VStack(alignment: .leading, spacing: 2) {
                    Text(status.label)
                        .font(.system(.title2, design: .rounded, weight: .heavy))
                        .foregroundStyle(Theme.textPrimary)
                    Text(status.detail)
                        .font(.subheadline)
                        .foregroundStyle(Theme.textSecondary)
                }
            }
            HStack(spacing: 12) {
                figure(
                    status == .unknown ? "–" : seconds(health.avgDuration),
                    "par synchro (2 h)"
                )
                figure("\(health.count)", "réussies (2 h)")
                if let hourly = health.hourly {
                    figure("\(hourly.reduce(0) { $0 + $1.failures })", "échecs (24 h)")
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .card()
        .accessibilityElement(children: .combine)
    }

    private func figure(_ value: String, _ label: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(value)
                .font(.system(.title3, design: .rounded, weight: .bold).monospacedDigit())
                .foregroundStyle(Theme.textPrimary)
            Text(label)
                .font(.caption2)
                .foregroundStyle(Theme.textTertiary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

private func seconds(_ milliseconds: Double) -> String {
    (milliseconds / 1000).formatted(.number.precision(.fractionLength(1)).locale(GradeFormat.french)) + " s"
}

private struct HealthHistoryCard: View {
    let buckets: [HealthBucket]
    private static let slowSeconds = 15.0

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Dernières 24 heures")
                .font(.system(.headline, design: .rounded, weight: .bold))
                .foregroundStyle(Theme.textPrimary)
            Chart {
                RuleMark(y: .value("Seuil", Self.slowSeconds))
                    .foregroundStyle(Theme.warning.foreground.opacity(0.6))
                    .lineStyle(StrokeStyle(lineWidth: 1, dash: [4, 4]))
                    .annotation(position: .top, alignment: .leading) {
                        Text("lent").font(.caption2).foregroundStyle(Theme.warning.foreground)
                    }
                ForEach(buckets) { bucket in
                    BarMark(
                        x: .value("Heure", bucket.hour, unit: .hour),
                        y: .value("Durée (s)", bucket.avgDuration / 1000)
                    )
                    .foregroundStyle(color(for: bucket))
                    .cornerRadius(3)
                    if bucket.failures > 0 {
                        PointMark(x: .value("Heure", bucket.hour, unit: .hour), y: .value("Échecs", 0))
                            .symbol(.triangle)
                            .symbolSize(40)
                            .foregroundStyle(Theme.danger.foreground)
                    }
                }
            }
            .chartXAxis {
                AxisMarks(values: .stride(by: .hour, count: 6)) { _ in
                    AxisGridLine()
                    AxisValueLabel(format: .dateTime.hour(.twoDigits(amPM: .omitted)).locale(GradeFormat.french))
                }
            }
            .chartYAxis {
                AxisMarks { value in
                    AxisGridLine()
                    AxisValueLabel { Text("\(value.as(Double.self) ?? 0, format: .number.precision(.fractionLength(0))) s") }
                }
            }
            .frame(height: 200)
            HStack(spacing: 14) {
                legend(Theme.primary, "durée moyenne")
                legend(Theme.danger.foreground, "échecs", symbol: "triangle.fill")
            }
            .font(.caption2)
            .foregroundStyle(Theme.textTertiary)
        }
        .card()
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(accessibilitySummary)
    }

    private func color(for bucket: HealthBucket) -> Color {
        let secondsValue = bucket.avgDuration / 1000
        if secondsValue > 20 { return Theme.danger.foreground }
        if secondsValue > Self.slowSeconds { return Theme.warning.foreground }
        return Theme.primary
    }

    private func legend(_ color: Color, _ label: String, symbol: String = "square.fill") -> some View {
        Label { Text(label) } icon: { Image(systemName: symbol).foregroundStyle(color) }
    }

    private var accessibilitySummary: String {
        let syncs = buckets.reduce(0) { $0 + $1.count }
        let failures = buckets.reduce(0) { $0 + $1.failures }
        return "Sur 24 heures : \(syncs) synchronisations réussies et \(failures) échecs."
    }
}
