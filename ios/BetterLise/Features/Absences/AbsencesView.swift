import SwiftUI

struct AbsencesView: View {
    @Environment(SessionStore.self) private var session
    @State private var model: AbsencesViewModel
    @Binding var isLoginPresented: Bool

    /// Above this share of unjustified absences the UE goes to revalidation.
    private let revalidationThreshold = 20.0

    init(model: AbsencesViewModel, isLoginPresented: Binding<Bool>) {
        _model = State(initialValue: model)
        _isLoginPresented = isLoginPresented
    }

    var body: some View {
        NavigationStack {
            Group {
                if session.isSignedIn {
                    if model.syncState.showsFullLoader, let startedAt = model.syncState.startedAt {
                        ScraperLoadingView(
                            startedAt: startedAt,
                            expectedDuration: model.health.expectedSyncDuration,
                            isFinished: model.syncState.isFinished,
                            slowNotice: model.health.slowNotice
                        )
                        .transition(.opacity.combined(with: .scale(scale: 0.96)))
                    } else {
                        content
                            .transition(.opacity)
                    }
                } else {
                    SignInPrompt(title: "Absences") { isLoginPresented = true }
                }
            }
            .animation(.smooth(duration: 0.4), value: model.syncState.showsFullLoader)
            .background(Theme.backgroundSecondary.ignoresSafeArea())
            .navigationTitle("Absences")
            .task(id: session.username) {
                if session.isSignedIn { await model.load() } else { model.reset() }
            }
        }
    }

    private var content: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                if let message = model.state.errorMessage {
                    ErrorBanner(message: message) { Task { await model.load() } }
                }
                if let data = model.state.value {
                    summary(data)
                    statsSection(data.stats)
                    listSection(data.absences)
                }
            }
            .padding(16)
        }
        .refreshable { await model.load() }
        .overlay(alignment: .bottom) {
            if model.syncState.showsCompactLoader, let startedAt = model.syncState.startedAt {
                SyncProgressPill(
                    startedAt: startedAt,
                    expectedDuration: model.health.expectedSyncDuration,
                    isFinished: model.syncState.isFinished
                )
                .padding(.bottom, 12)
                .transition(.move(edge: .bottom).combined(with: .opacity))
            }
        }
        .animation(.spring(duration: 0.4), value: model.syncState.showsCompactLoader)
    }

    private func summary(_ data: AbsencesResponse) -> some View {
        HStack(spacing: 12) {
            summaryTile(value: "\(data.nbTotalAbsences)", label: "absences", icon: "calendar.badge.minus")
            summaryTile(value: data.dureeTotaleAbsences, label: "au total", icon: "clock")
        }
    }

    private func summaryTile(value: String, label: String, icon: String) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundStyle(Theme.primary)
            Text(value)
                .font(.system(size: 34, weight: .heavy, design: .rounded).monospacedDigit())
                .foregroundStyle(Theme.textPrimary)
                .minimumScaleFactor(0.6)
                .lineLimit(1)
            Text(label)
                .font(.subheadline)
                .foregroundStyle(Theme.textTertiary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .card()
        .accessibilityElement(children: .combine)
    }

    @ViewBuilder
    private func statsSection(_ stats: [AbsenceStat]) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Par UE")
                .font(.system(.title3, design: .rounded, weight: .bold))
            Text("Part d'absences non justifiées. Au-delà de 20 %, la revalidation est automatique. Ceci est une estimation : vérifie sur Lise.")
                .font(.footnote)
                .foregroundStyle(Theme.textTertiary)
            if stats.isEmpty {
                Text("Aucune absence non justifiée rattachée à une UE.")
                    .font(.subheadline)
                    .foregroundStyle(Theme.textSecondary)
                    .card()
            }
            ForEach(stats) { stat in
                AbsenceStatCard(stat: stat, threshold: revalidationThreshold)
            }
        }
    }

    @ViewBuilder
    private func listSection(_ absences: [Absence]) -> some View {
        if !absences.isEmpty {
            VStack(alignment: .leading, spacing: 12) {
                Text("Historique")
                    .font(.system(.title3, design: .rounded, weight: .bold))
                VStack(spacing: 0) {
                    ForEach(Array(absences.enumerated()), id: \.offset) { index, absence in
                        AbsenceRow(absence: absence)
                        if index < absences.count - 1 { Divider() }
                    }
                }
                .card()
            }
        }
    }
}

private struct AbsenceStatCard: View {
    let stat: AbsenceStat
    let threshold: Double

    var body: some View {
        let badge = Theme.absenceBadge(stat.percentage)
        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .firstTextBaseline) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(stat.name).font(.subheadline.weight(.semibold))
                    Text(stat.code).font(.caption.monospaced()).foregroundStyle(Theme.textTertiary)
                }
                Spacer()
                Text(stat.percentage.formatted(.number.precision(.fractionLength(1))) + " %")
                    .font(.subheadline.weight(.bold).monospacedDigit())
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .foregroundStyle(badge.foreground)
                    .background(badge.background, in: Capsule())
            }
            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    Capsule().fill(Theme.backgroundTertiary)
                    Capsule()
                        .fill(badge.foreground)
                        .frame(width: geometry.size.width * min(stat.percentage, 100) / 100)
                    Rectangle()
                        .fill(Theme.textPrimary.opacity(0.35))
                        .frame(width: 2)
                        .offset(x: geometry.size.width * threshold / 100)
                }
            }
            .frame(height: 8)
            .accessibilityHidden(true)
            HStack {
                Text("Absent : \(stat.absentHours.formatted(.number.precision(.fractionLength(0...1)))) h")
                Spacer()
                Text("Module : \(stat.totalUE.formatted()) h")
            }
            .font(.caption)
            .foregroundStyle(Theme.textTertiary)
        }
        .card()
    }
}

private struct AbsenceRow: View {
    let absence: Absence

    private var isJustified: Bool {
        let motif = absence.motif.trimmingCharacters(in: .whitespaces).lowercased()
        return !motif.isEmpty && motif != "non excusé" && motif != "non excuse"
    }

    var body: some View {
        let badge = isJustified ? Theme.success : Theme.danger
        HStack(alignment: .top, spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                Text(absence.matiere.isEmpty ? absence.cours : absence.matiere)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Theme.textPrimary)
                Text("\(absence.date) · \(absence.horaire)")
                    .font(.caption)
                    .foregroundStyle(Theme.textTertiary)
                Text(isJustified ? absence.motif : "Non justifiée")
                    .font(.caption.weight(.medium))
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .foregroundStyle(badge.foreground)
                    .background(badge.background, in: Capsule())
            }
            Spacer()
            Text(absence.duree)
                .font(.subheadline.monospacedDigit())
                .foregroundStyle(Theme.textSecondary)
        }
        .padding(.vertical, 10)
        .accessibilityElement(children: .combine)
    }
}
