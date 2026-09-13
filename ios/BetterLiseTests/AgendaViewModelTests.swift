import Foundation
import Testing
@testable import BetterLise

@MainActor
struct AgendaViewModelTests {
    private func makeModel(today: Date) -> AgendaViewModel {
        let defaults = UserDefaults(suiteName: "tests.\(UUID().uuidString)")!
        let client = APIClient(baseURL: URL(string: "http://localhost:3000")!, session: StubURLProtocol.makeSession())
        return AgendaViewModel(
            session: SessionStore(client: client, secureStore: InMemorySecureStore()),
            settings: SettingsStore(defaults: defaults),
            cache: ResponseCache(directory: FileManager.default.temporaryDirectory.appending(path: UUID().uuidString)),
            now: { today }
        )
    }

    private let wednesday = Calendar.paris.date(from: DateComponents(year: 2025, month: 3, day: 12, hour: 9))!

    @Test func opensOnTodayAndItsWeek() {
        let model = makeModel(today: wednesday)

        #expect(model.selectedIndex == model.todayIndex)
        #expect(model.visibleWeek == model.todayIndex / 5)
        #expect(Calendar.paris.isDate(model.selectedDay, inSameDayAs: wednesday))
        #expect(model.isShowingToday)
        #expect(model.pagerRequest == nil)
        #expect(model.stripRequest == nil)
    }

    @Test func swipingWithinTheWeekOnlyMovesTheHighlight() {
        let model = makeModel(today: wednesday)

        model.pagerDidScroll(to: model.todayIndex + 1)

        #expect(model.selectedIndex == model.todayIndex + 1)
        #expect(model.visibleWeek == model.todayIndex / 5)
        #expect(model.stripRequest == nil)
        #expect(model.pagerRequest == nil)
    }

    @Test func swipingPastFridayAsksTheWeekStripToFollow() {
        let model = makeModel(today: wednesday)
        let nextMonday = model.todayIndex + 3

        model.pagerDidScroll(to: nextMonday)

        #expect(model.visibleWeek == model.todayIndex / 5 + 1)
        #expect(model.stripRequest?.target == model.todayIndex / 5 + 1)
        #expect(model.pagerRequest == nil)
        #expect(Calendar.paris.component(.weekday, from: model.selectedDay) == 2) // Monday
        #expect(!model.isShowingToday)
    }

    @Test func swipingTheWeekStripKeepsTheWeekdayAndMovesThePager() {
        let model = makeModel(today: wednesday)

        model.stripDidScroll(to: model.visibleWeek - 1)

        #expect(model.selectedIndex == model.todayIndex - 5)
        #expect(model.pagerRequest?.target == model.todayIndex - 5)
        #expect(model.stripRequest == nil)
        #expect(Calendar.paris.component(.weekday, from: model.selectedDay) == 4) // Wednesday
    }

    @Test func reportsFromTheScrollViewsWeAlreadyMatchAreIgnored() {
        let model = makeModel(today: wednesday)
        model.pagerDidScroll(to: model.todayIndex + 3)
        let request = model.stripRequest

        // The strip reports the week it was asked to show: nothing else must move
        model.stripDidScroll(to: model.visibleWeek)

        #expect(model.stripRequest == request)
        #expect(model.pagerRequest == nil)
        #expect(model.selectedIndex == model.todayIndex + 3)
    }

    @Test func tappingADayMovesThePagerAndTheStripWhenNeeded() {
        let model = makeModel(today: wednesday)

        model.select(model.todayIndex - 2)
        #expect(model.pagerRequest?.target == model.todayIndex - 2)
        #expect(model.stripRequest == nil)

        model.goToToday()
        #expect(model.selectedIndex == model.todayIndex)
        #expect(model.pagerRequest?.target == model.todayIndex)

        model.select(0)
        #expect(model.visibleWeek == 0)
        #expect(model.stripRequest?.target == 0)
    }

    @Test func repeatedRequestsToTheSameTargetAreDistinct() {
        let model = makeModel(today: wednesday)
        model.select(model.todayIndex + 1)
        let first = model.pagerRequest
        model.pagerDidScroll(to: model.todayIndex)
        model.select(model.todayIndex + 1)

        #expect(model.pagerRequest?.target == first?.target)
        #expect(model.pagerRequest != first)
    }
}
