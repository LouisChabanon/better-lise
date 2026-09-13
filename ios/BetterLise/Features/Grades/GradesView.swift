import SwiftUI

struct GradesView: View {
    @Environment(SessionStore.self) private var session
    @State private var model: GradesViewModel
    @State private var selectedGrade: Grade?
    @Binding var isLoginPresented: Bool

    init(model: GradesViewModel, isLoginPresented: Binding<Bool>) {
        _model = State(initialValue: model)
        _isLoginPresented = isLoginPresented
    }

    var body: some View {
        NavigationStack {
            Group {
                if session.isSignedIn {
                    list
                } else {
                    SignInPrompt(title: "Notes") { isLoginPresented = true }
                }
            }
            .background(Theme.backgroundSecondary.ignoresSafeArea())
            .navigationTitle("Notes")
            .sheet(item: $selectedGrade) { grade in
                GradeDetailSheet(grade: grade, loadStats: { try await model.stats(for: grade) })
                    .presentationDetents([.medium, .large])
                    .task { await model.markOpened(grade) }
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

            if model.state.value == nil, model.state.isLoading {
                loadingRow
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
            if grades.isEmpty, !model.state.isLoading, model.state.errorMessage == nil {
                ContentUnavailableView.search(text: model.searchText)
                    .listRowBackground(Color.clear)
            }
        }
        .scrollContentBackground(.hidden)
        .searchable(text: $model.searchText, prompt: "Rechercher une matière")
        .refreshable { await model.load() }
        .overlay(alignment: .top) {
            if model.state.isLoading, model.state.value != nil {
                ProgressView("Synchronisation avec Lise…")
                    .font(.caption)
                    .padding(8)
                    .background(.regularMaterial, in: Capsule())
                    .padding(.top, 4)
            }
        }
    }

    private var loadingRow: some View {
        HStack(spacing: 12) {
            ProgressView()
            Text("Récupération de tes notes sur Lise… cela peut prendre quelques secondes.")
                .font(.subheadline)
                .foregroundStyle(Theme.textTertiary)
        }
        .padding(.vertical, 8)
    }

    private func row(_ grade: Grade) -> some View {
        Button { selectedGrade = grade } label: {
            GradeRow(grade: grade)
        }
        .listRowBackground(Theme.backgroundPrimary)
    }
}

struct GradeRow: View {
    let grade: Grade

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
            Text(grade.note.formatted(.number.precision(.fractionLength(0...2)).locale(Locale(identifier: "fr_FR"))))
                .font(.system(.title3, design: .rounded, weight: .bold).monospacedDigit())
                .foregroundStyle(badge.foreground)
                .frame(minWidth: 56)
                .padding(.vertical, 8)
                .background(badge.background, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
        }
        .padding(.vertical, 4)
        .contentShape(Rectangle())
    }
}
