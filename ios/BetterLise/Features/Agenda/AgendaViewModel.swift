import Foundation
import Observation

@MainActor
@Observable
final class AgendaViewModel {
    /// School weeks reachable by swiping on each side of the current week.
    static let weeksAround = 26

    private(set) var state: Loadable<[CalendarEvent]> = .idle
    private(set) var eventsByDay: [Date: [CalendarEvent]] = [:]

    let days: [Date]
    let today: Date
    let todayIndex: Int

    /// Week shown by the pager.
    private(set) var visibleWeek: Int

    /// Programmatic scroll the pager must perform ("Aujourd'hui").
    private(set) var pagerRequest: ScrollRequest?

    private let session: SessionStore
    private let settings: SettingsStore
    private let cache: ResponseCache

    init(session: SessionStore, settings: SettingsStore, cache: ResponseCache, now: () -> Date = Date.init) {
        self.session = session
        self.settings = settings
        self.cache = cache
        today = now()
        days = AgendaLayout.schoolDays(around: today, weeksBefore: Self.weeksAround, weeksAfter: Self.weeksAround)
        todayIndex = AgendaLayout.initialIndex(in: days, today: today)
        visibleWeek = todayIndex / 5
    }

    var weekCount: Int { days.count / 5 }
    /// Week of today, or the upcoming one on weekends.
    var currentWeek: Int { todayIndex / 5 }
    var isShowingCurrentWeek: Bool { visibleWeek == currentWeek }

    /// Monday of the week currently shown, used for the title.
    var visibleWeekStart: Date { days[min(visibleWeek * 5, days.count - 1)] }

    /// The user swiped the pager.
    func pagerDidScroll(toWeek week: Int) {
        guard (0..<weekCount).contains(week), week != visibleWeek else { return }
        visibleWeek = week
    }

    func goToToday() {
        visibleWeek = currentWeek
        pagerRequest = ScrollRequest(target: currentWeek)
    }

    func days(inWeek week: Int) -> ArraySlice<Date> {
        let start = week * 5
        return days[start..<min(start + 5, days.count)]
    }

    func events(on day: Date) -> [CalendarEvent] {
        eventsByDay[Calendar.paris.startOfDay(for: day)] ?? []
    }

    func hasAllDayEvents(inWeek week: Int) -> Bool {
        days(inWeek: week).contains { day in events(on: day).contains(where: \.isAllDay) }
    }

    private var cacheKey: String { "agenda-\(settings.liseId)-\(settings.campus.rawValue)-\(settings.showRU)" }

    func load() async {
        guard settings.hasValidLiseId else {
            apply(.idle)
            return
        }
        let cached = cache.load([CalendarEvent].self, key: cacheKey) ?? state.value
        apply(.loading(cached: cached))
        do {
            let response = try await session.sendPublic(
                Endpoints.agenda(liseId: settings.liseId, tbk: settings.campus.rawValue, includeRU: settings.showRU)
            )
            cache.save(response.events, key: cacheKey)
            apply(.loaded(response.events))
        } catch {
            apply(.failed(message: error.localizedDescription, cached: cached))
        }
    }

    private func apply(_ newState: Loadable<[CalendarEvent]>) {
        if newState.value != state.value {
            eventsByDay = AgendaLayout.groupByDay(newState.value ?? [])
        }
        state = newState
    }
}

/// A one-shot scroll command. The UUID makes two requests for the same target distinct.
struct ScrollRequest: Equatable {
    let target: Int
    private let id = UUID()

    init(target: Int) {
        self.target = target
    }
}
