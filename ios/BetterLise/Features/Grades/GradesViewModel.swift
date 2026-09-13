import Foundation
import Observation

@MainActor
@Observable
final class GradesViewModel {
    private(set) var state: Loadable<[Grade]> = .idle
    var searchText = ""

    private let session: SessionStore
    private let cache: ResponseCache
    private let cacheKey = "grades"

    init(session: SessionStore, cache: ResponseCache) {
        self.session = session
        self.cache = cache
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
        do {
            let response = try await session.send(Endpoints.grades(refresh: refresh))
            let sorted = GradeSorting.sorted(response.grades)
            cache.save(sorted, key: cacheKey)
            state = .loaded(sorted)
        } catch {
            state = .failed(message: error.localizedDescription, cached: cached)
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

    func stats(for grade: Grade) async throws -> GradeStats {
        try await session.send(Endpoints.gradeStats(code: grade.code))
    }

    func reset() {
        state = .idle
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
