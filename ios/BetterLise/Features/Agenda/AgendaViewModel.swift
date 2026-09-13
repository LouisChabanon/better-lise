import Foundation
import Observation

@MainActor
@Observable
final class AgendaViewModel {
    private(set) var state: Loadable<[CalendarEvent]> = .idle
    var weekOffset = 0
    var selectedDayIndex: Int

    private let session: SessionStore
    private let settings: SettingsStore
    private let cache: ResponseCache
    private let now: () -> Date

    init(session: SessionStore, settings: SettingsStore, cache: ResponseCache, now: @escaping () -> Date = Date.init) {
        self.session = session
        self.settings = settings
        self.cache = cache
        self.now = now
        let weekday = Calendar.paris.component(.weekday, from: now())
        selectedDayIndex = (2...6).contains(weekday) ? weekday - 2 : 0
    }

    private var cacheKey: String { "agenda-\(settings.liseId)-\(settings.campus.rawValue)-\(settings.showRU)" }

    var weekDays: [Date] { AgendaLayout.weekDays(containing: now(), weekOffset: weekOffset) }

    var selectedDay: Date? {
        weekDays.indices.contains(selectedDayIndex) ? weekDays[selectedDayIndex] : nil
    }

    func events(on day: Date) -> [CalendarEvent] {
        AgendaLayout.events(on: day, from: state.value ?? [])
    }

    func load() async {
        guard settings.hasValidLiseId else {
            state = .idle
            return
        }
        let cached = cache.load([CalendarEvent].self, key: cacheKey) ?? state.value
        state = .loading(cached: cached)
        do {
            let response = try await session.sendPublic(
                Endpoints.agenda(liseId: settings.liseId, tbk: settings.campus.rawValue, includeRU: settings.showRU)
            )
            cache.save(response.events, key: cacheKey)
            state = .loaded(response.events)
        } catch {
            state = .failed(message: error.localizedDescription, cached: cached)
        }
    }

    func shiftWeek(by delta: Int) {
        weekOffset += delta
        selectedDayIndex = delta > 0 ? 0 : 4
    }

    func goToToday() {
        weekOffset = 0
        let weekday = Calendar.paris.component(.weekday, from: now())
        selectedDayIndex = (2...6).contains(weekday) ? weekday - 2 : 0
    }
}
