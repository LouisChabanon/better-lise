import Foundation
import Observation

@MainActor
@Observable
final class GradesViewModel {
    private(set) var state: Loadable<[Grade]> = .idle
    private(set) var syncState: SyncState = .idle
    var searchText = ""

    let health: LiseHealthMonitor
    private let session: SessionStore
    private let cache: ResponseCache
    private let cacheKey = "grades"

    init(session: SessionStore, cache: ResponseCache, health: LiseHealthMonitor) {
        self.session = session
        self.cache = cache
        self.health = health
    }

    var visibleGrades: [Grade] {
        let grades = state.value ?? []
        let query = searchText.trimmingCharacters(in: .whitespaces)
        guard !query.isEmpty else { return grades }
        return grades.filter {
            $0.libelle.localizedCaseInsensitiveContains(query) || $0.code.localizedCaseInsensitiveContains(query)
        }
    }

    var unreadCount: Int { (state.value ?? []).filter(\.isUnread).count }

    func load(refresh: Bool = true) async {
        let cached = cache.load([Grade].self, key: cacheKey) ?? state.value
        state = .loading(cached: cached)
        let startedAt = Date()
        let hasContent = !(cached ?? []).isEmpty
        syncState = .syncing(startedAt: startedAt, hasContent: hasContent)
        Task { await health.refreshIfNeeded() }

        do {
            let response = try await session.send(Endpoints.grades(refresh: refresh))
            let sorted = GradeSorting.sorted(response.grades)
            cache.save(sorted, key: cacheKey)
            state = .loaded(sorted)
            completeSync(startedAt: startedAt, hasContent: hasContent)
        } catch {
            syncState = .idle
            state = .failed(message: error.localizedDescription, cached: cached)
        }
    }

    /// Shows the "Terminé" state briefly, like the web app, before revealing the content.
    private func completeSync(startedAt: Date, hasContent: Bool) {
        syncState = .finished(startedAt: startedAt, hasContent: hasContent)
        Task {
            try? await Task.sleep(for: SyncState.completionDisplayDuration)
            if syncState == .finished(startedAt: startedAt, hasContent: hasContent) {
                syncState = .idle
            }
        }
    }

    /// Optimistically clears the "new" flag, then persists it server-side.
    func markOpened(_ grade: Grade) async {
        guard grade.isUnread, let grades = state.value else { return }
        let updated = grades.map { $0.code == grade.code ? Grade(copying: $0, isNew: false) : $0 }
        state = .loaded(updated)
        cache.save(updated, key: cacheKey)
        do {
            _ = try await session.send(Endpoints.markGradeOpened(code: grade.code))
        } catch {
            state = .failed(message: error.localizedDescription, cached: grades)
        }
    }

    /// Reveal mode replay: hides the grade again, rolling back if the server fails.
    func markNew(_ grade: Grade) async {
        // The caller may hold a stale copy (e.g. taken before the reveal): trust the current list
        guard let grades = state.value, grades.contains(where: { $0.code == grade.code && !$0.isUnread }) else { return }
        let updated = grades.map { $0.code == grade.code ? Grade(copying: $0, isNew: true) : $0 }
        state = .loaded(GradeSorting.sorted(updated))
        do {
            _ = try await session.send(Endpoints.markGradeNew(code: grade.code))
            cache.save(state.value ?? updated, key: cacheKey)
        } catch {
            state = .failed(message: error.localizedDescription, cached: grades)
        }
    }

    func stats(for grade: Grade) async throws -> GradeStats {
        try await session.send(Endpoints.gradeStats(code: grade.code))
    }

    func reset() {
        state = .idle
        syncState = .idle
        cache.save([Grade](), key: cacheKey)
    }
}

extension Grade {
    init(copying grade: Grade, isNew: Bool) {
        self.init(
            date: grade.date,
            code: grade.code,
            libelle: grade.libelle,
            note: grade.note,
            absence: grade.absence,
            comment: grade.comment,
            teachers: grade.teachers,
            isNew: isNew
        )
    }
}
