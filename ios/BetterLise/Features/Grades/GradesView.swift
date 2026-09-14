import SwiftUI

struct GradesView: View {
    @Environment(SessionStore.self) private var session
    @Environment(SettingsStore.self) private var settings
    @State private var model: GradesViewModel
    @State private var selectedGrade: Grade?
    /// Reveal mode: new grade currently being revealed.
    @State private var gradeToReveal: Grade?
    /// Set when the reveal finished, so the detail opens once its sheet is gone.
    @State private var revealedGrade: Grade?
    @Binding var isLoginPresented: Bool

    init(model: GradesViewModel, isLoginPresented: Binding<Bool>) {
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
                        list
                            .transition(.opacity)
                    }
                } else {
                    SignInPrompt(title: "Notes") { isLoginPresented = true }
                }
            }
            .animation(.smooth(duration: 0.4), value: model.syncState.showsFullLoader)
            .background(Theme.backgroundSecondary.ignoresSafeArea())
            .navigationTitle("Notes")
            .sheet(item: $selectedGrade) { grade in
                GradeDetailSheet(
                    grade: grade,
                    loadStats: { try await model.stats(for: grade) },
                    onMarkAsNew: {
                        selectedGrade = nil
                        Task { await model.markNew(grade) }
                    }
                )
                .presentationDetents([.medium, .large])
                .task { await model.markOpened(grade) }
            }
            .sheet(item: $gradeToReveal, onDismiss: {
                if let revealedGrade {
                    selectedGrade = revealedGrade
                    self.revealedGrade = nil
                }
            }) { grade in
                GradeRevealSheet(
                    grade: grade,
                    onReveal: { Task { await model.markOpened(grade) } },
                    onComplete: {
                        revealedGrade = grade
                        gradeToReveal = nil
                    }
                )
                .presentationDetents([.height(380)])
                .presentationDragIndicator(.hidden)
            }
            .task(id: session.username) {
                if session.isSignedIn { await model.load() } else { model.reset() }
            }
        }
    }

    private var list: some View {
        List {
            if let message = model.state.errorMessage {
                ErrorBanner(message: message) { Task { await model.load() } }
                    .listRowBackground(Color.clear)
                    .listRowInsets(EdgeInsets(top: 4, leading: 16, bottom: 4, trailing: 16))
            }

            let grades = model.visibleGrades
            let unread = grades.filter(\.isUnread)
            let read = grades.filter { !$0.isUnread }

            if !unread.isEmpty {
                Section("Nouvelles notes") {
                    ForEach(unread) { row($0) }
                }
            }
            if !read.isEmpty {
                Section(unread.isEmpty ? "Toutes les notes" : "Déjà consultées") {
                    ForEach(read) { row($0) }
                }
            }
            if grades.isEmpty, model.syncState == .idle, model.state.errorMessage == nil {
                ContentUnavailableView.search(text: model.searchText)
                    .listRowBackground(Color.clear)
            }
        }
        .scrollContentBackground(.hidden)
        .searchable(text: $model.searchText, prompt: "Rechercher une matière")
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

    private func row(_ grade: Grade) -> some View {
        let hidesNote = settings.revealMode && grade.isUnread
        return Button {
            if hidesNote { gradeToReveal = grade } else { selectedGrade = grade }
        } label: {
            GradeRow(grade: grade, hidesNote: hidesNote)
        }
        .accessibilityIdentifier(hidesNote ? "hiddenGrade" : "grade")
        .listRowBackground(Theme.backgroundPrimary)
    }
}

struct GradeRow: View {
    let grade: Grade
    /// Reveal mode keeps new grades behind a "?" until they are revealed.
    var hidesNote = false

    var body: some View {
        let badge = Theme.gradeBadge(grade.note)
        HStack(spacing: 14) {
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 6) {
                    if grade.isUnread {
                        Circle().fill(Theme.primary).frame(width: 8, height: 8)
                            .accessibilityLabel("Nouvelle note")
                    }
                    Text(grade.libelle)
                        .font(.body.weight(.semibold))
                        .foregroundStyle(Theme.textPrimary)
                        .lineLimit(2)
                }
                Text("\(grade.date) · \(grade.code)")
                    .font(.caption)
                    .foregroundStyle(Theme.textTertiary)
                    .lineLimit(1)
            }
            Spacer(minLength: 8)
            if hidesNote {
                Text("?")
                    .font(.system(.title3, design: .rounded, weight: .heavy))
                    .foregroundStyle(Theme.onPrimary)
                    .frame(minWidth: 56)
                    .padding(.vertical, 8)
                    .background(Theme.primary, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                    .accessibilityLabel("Note à révéler")
            } else {
                Text(grade.note.formatted(.number.precision(.fractionLength(0...2)).locale(Locale(identifier: "fr_FR"))))
                    .font(.system(.title3, design: .rounded, weight: .bold).monospacedDigit())
                    .foregroundStyle(badge.foreground)
                    .frame(minWidth: 56)
                    .padding(.vertical, 8)
                    .background(badge.background, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
            }
        }
        .padding(.vertical, 4)
        .contentShape(Rectangle())
    }
}
