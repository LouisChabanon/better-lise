import Charts
import SwiftUI

struct GradeDetailSheet: View {
    let grade: Grade
    let loadStats: () async throws -> GradeStats

    @State private var stats: Loadable<GradeStats> = .idle

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    header
                    switch stats {
                    case .idle, .loading:
                        ProgressView("Calcul des statistiques…")
                            .frame(maxWidth: .infinity, minHeight: 160)
                    case .loaded(let value):
                        statsGrid(value)
                        distributionChart(value)
                    case .failed(let message, _):
                        ErrorBanner(message: message) { Task { await fetch() } }
                    }
                    if !grade.comment.isEmpty || !grade.teachers.isEmpty {
                        details
                    }
                }
                .padding(20)
            }
            .background(Theme.backgroundSecondary.ignoresSafeArea())
            .task { await fetch() }
        }
    }

    private func fetch() async {
        stats = .loading(cached: nil)
        do {
            stats = .loaded(try await loadStats())
        } catch {
            stats = .failed(message: error.localizedDescription, cached: nil)
        }
    }

    private var header: some View {
        let badge = Theme.gradeBadge(grade.note)
        return HStack(alignment: .top) {
            VStack(alignment: .leading, spacing: 6) {
                Text(grade.libelle)
                    .font(.system(.title2, design: .rounded, weight: .bold))
                    .foregroundStyle(Theme.textPrimary)
                Text("\(grade.date) · \(grade.code)")
                    .font(.footnote)
                    .foregroundStyle(Theme.textTertiary)
            }
            Spacer()
            VStack(spacing: 0) {
                Text(format(grade.note))
                    .font(.system(size: 34, weight: .heavy, design: .rounded).monospacedDigit())
                Text("/20").font(.caption.weight(.semibold))
            }
            .foregroundStyle(badge.foreground)
            .padding(12)
            .background(badge.background, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
        }
    }

    private func statsGrid(_ stats: GradeStats) -> some View {
        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
            statTile("Moyenne", format(stats.avg))
            statTile("Médiane", format(stats.median))
            statTile("Écart-type", format(stats.stdDeviation))
            statTile("Min", format(stats.min))
            statTile("Max", format(stats.max))
            statTile("Notes", "\(stats.count)")
        }
    }

    private func statTile(_ title: String, _ value: String) -> some View {
        VStack(spacing: 4) {
            Text(value)
                .font(.system(.headline, design: .rounded).monospacedDigit())
                .foregroundStyle(Theme.textPrimary)
            Text(title)
                .font(.caption2)
                .foregroundStyle(Theme.textTertiary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
        .background(Theme.backgroundPrimary, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
        .accessibilityElement(children: .combine)
    }

    private func distributionChart(_ stats: GradeStats) -> some View {
        let userBin = GradeSorting.binIndex(for: grade.note, binCount: stats.distribution.counts.count)
        let bins = Array(zip(stats.distribution.labels, stats.distribution.counts).enumerated())
        return VStack(alignment: .leading, spacing: 12) {
            Text("Répartition de la promo")
                .font(.headline)
                .foregroundStyle(Theme.textPrimary)
            Chart(bins, id: \.offset) { index, bin in
                BarMark(x: .value("Tranche", bin.0), y: .value("Élèves", bin.1))
                    .foregroundStyle(index == userBin ? Theme.primary : Theme.primary.opacity(0.25))
                    .cornerRadius(4)
            }
            .chartXAxis {
                AxisMarks { _ in AxisValueLabel().font(.caption2) }
            }
            .frame(height: 180)
            Text("Ta tranche est mise en évidence. Statistiques calculées à partir des utilisateurs de Better Lise.")
                .font(.caption)
                .foregroundStyle(Theme.textTertiary)
        }
        .card()
    }

    private var details: some View {
        VStack(alignment: .leading, spacing: 10) {
            if !grade.teachers.isEmpty {
                Label(grade.teachers, systemImage: "person")
            }
            if !grade.comment.isEmpty {
                Label(grade.comment, systemImage: "text.bubble")
            }
        }
        .font(.subheadline)
        .foregroundStyle(Theme.textSecondary)
        .frame(maxWidth: .infinity, alignment: .leading)
        .card()
    }

    private func format(_ value: Double) -> String {
        value.formatted(.number.precision(.fractionLength(0...2)).locale(Locale(identifier: "fr_FR")))
    }
}
