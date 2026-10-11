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

    private let saturday = Calendar.paris.date(from: DateComponents(year: 2025, month: 3, day: 15, hour: 9))!

    @Test func opensOnTheCurrentWeek() {
        let model = makeModel(today: wednesday)

        #expect(model.visibleWeek == model.currentWeek)
        #expect(model.currentWeek == model.todayIndex / 5)
        #expect(Calendar.paris.component(.weekday, from: model.visibleWeekStart) == 2) // Monday
        #expect(Calendar.paris.component(.day, from: model.visibleWeekStart) == 10)
        #expect(model.isShowingCurrentWeek)
        #expect(model.pagerRequest == nil)
    }

    @Test func opensOnTheNextWeekOnWeekends() {
        let model = makeModel(today: saturday)

        #expect(Calendar.paris.component(.day, from: model.visibleWeekStart) == 17)
        #expect(model.isShowingCurrentWeek)
    }

    @Test func swipingChangesTheVisibleWeek() {
        let model = makeModel(today: wednesday)

        model.pagerDidScroll(toWeek: model.currentWeek + 1)

        #expect(model.visibleWeek == model.currentWeek + 1)
        #expect(Calendar.paris.component(.day, from: model.visibleWeekStart) == 17)
        #expect(!model.isShowingCurrentWeek)
        #expect(model.pagerRequest == nil)
    }

    @Test func reportsForTheWeekAlreadyShownOrOutOfRangeAreIgnored() {
        let model = makeModel(today: wednesday)
        model.pagerDidScroll(toWeek: model.currentWeek + 1)

        model.pagerDidScroll(toWeek: model.visibleWeek)
        model.pagerDidScroll(toWeek: -1)
        model.pagerDidScroll(toWeek: model.weekCount)

        #expect(model.visibleWeek == model.currentWeek + 1)
        #expect(model.pagerRequest == nil)
    }

    @Test func goingBackToTodayScrollsToTheCurrentWeek() {
        let model = makeModel(today: wednesday)
        model.pagerDidScroll(toWeek: 0)

        model.goToToday()

        #expect(model.visibleWeek == model.currentWeek)
        #expect(model.pagerRequest?.target == model.currentWeek)
        #expect(model.isShowingCurrentWeek)
    }

    @Test func repeatedRequestsToTheSameTargetAreDistinct() {
        let model = makeModel(today: wednesday)
        model.pagerDidScroll(toWeek: 0)
        model.goToToday()
        let first = model.pagerRequest
        model.pagerDidScroll(toWeek: 1)
        model.goToToday()

        #expect(model.pagerRequest?.target == first?.target)
        #expect(model.pagerRequest != first)
    }

    @Test func weeksExposeTheirFiveSchoolDays() {
        let model = makeModel(today: wednesday)

        let days = model.days(inWeek: model.currentWeek)

        #expect(days.count == 5)
        #expect(days.contains { Calendar.paris.isDate($0, inSameDayAs: wednesday) })
        #expect(!model.hasAllDayEvents(inWeek: model.currentWeek))
    }
}
