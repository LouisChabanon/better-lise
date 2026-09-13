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
    let todayIndex: Int

    /// Day shown by the pager.
    private(set) var selectedIndex: Int
    /// Week shown by the strip.
    private(set) var visibleWeek: Int

    /// Programmatic scroll the pager must perform (the other scroll view or a tap moved the selection).
    private(set) var pagerRequest: ScrollRequest?
    /// Programmatic scroll the week strip must perform (the pager crossed into another week).
    private(set) var stripRequest: ScrollRequest?

    private let session: SessionStore
    private let settings: SettingsStore
    private let cache: ResponseCache

    init(session: SessionStore, settings: SettingsStore, cache: ResponseCache, now: () -> Date = Date.init) {
        self.session = session
        self.settings = settings
        self.cache = cache
        let today = now()
        days = AgendaLayout.schoolDays(around: today, weeksBefore: Self.weeksAround, weeksAfter: Self.weeksAround)
        todayIndex = AgendaLayout.initialIndex(in: days, today: today)
        selectedIndex = todayIndex
        visibleWeek = todayIndex / 5
    }

    var selectedDay: Date { days[selectedIndex] }
    var weekCount: Int { days.count / 5 }
    var isShowingToday: Bool { selectedIndex == todayIndex }

    /// Monday of the week currently shown in the strip, used for the title.
    var visibleWeekStart: Date { days[min(visibleWeek * 5, days.count - 1)] }

    // MARK: Scroll coordination
    //
    // SwiftUI ignores `scrollPosition` changes made while another scroll view is being dragged, so
    // user scrolls are reported here and the other scroll view receives an explicit request.

    /// The user swiped the day pager.
    func pagerDidScroll(to index: Int) {
        guard days.indices.contains(index), index != selectedIndex else { return }
        selectedIndex = index
        let week = index / 5
        if week != visibleWeek {
            visibleWeek = week
            stripRequest = ScrollRequest(target: week)
        }
    }

    /// The user swiped the week strip: keep the same weekday in the new week.
    func stripDidScroll(to week: Int) {
        guard (0..<weekCount).contains(week), week != visibleWeek else { return }
        visibleWeek = week
        let index = min(week * 5 + selectedIndex % 5, days.count - 1)
        if index != selectedIndex {
            selectedIndex = index
            pagerRequest = ScrollRequest(target: index)
        }
    }

    /// A day card was tapped (or "Aujourd'hui"): both scroll views follow.
    func select(_ index: Int) {
        guard days.indices.contains(index) else { return }
        selectedIndex = index
        pagerRequest = ScrollRequest(target: index)
        let week = index / 5
        if week != visibleWeek {
            visibleWeek = week
            stripRequest = ScrollRequest(target: week)
        }
    }

    func goToToday() {
        select(todayIndex)
    }

    func days(inWeek week: Int) -> ArraySlice<Date> {
        let start = week * 5
        return days[start..<min(start + 5, days.count)]
    }

    func events(on day: Date) -> [CalendarEvent] {
        eventsByDay[Calendar.paris.startOfDay(for: day)] ?? []
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
