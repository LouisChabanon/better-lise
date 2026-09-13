import Foundation
import Testing
@testable import BetterLise

struct AgendaLayoutTests {
    private func date(_ day: Int, _ hour: Int, _ minute: Int = 0) -> Date {
        Calendar.paris.date(from: DateComponents(year: 2025, month: 3, day: day, hour: hour, minute: minute))!
    }

    private func event(_ title: String, _ start: Date, _ end: Date, allDay: Bool = false) -> CalendarEvent {
        CalendarEvent(title: title, startDate: start, endDate: end, summary: nil, room: nil, teacher: nil, group: nil, type: "CM", isAllDay: allDay)
    }

    @Test func nonOverlappingEventsTakeFullWidth() {
        let placed = AgendaLayout.place([
            event("B", date(10, 10), date(10, 12)),
            event("A", date(10, 8), date(10, 10)),
        ])
        #expect(placed.map(\.event.title) == ["A", "B"])
        #expect(placed.allSatisfy { $0.column == 0 && $0.columnCount == 1 })
    }

    @Test func overlappingEventsShareColumnsAndReuseFreedOnes() {
        let placed = AgendaLayout.place([
            event("A", date(10, 8), date(10, 12)),
            event("B", date(10, 9), date(10, 10)),
            event("C", date(10, 10), date(10, 11)),
            event("D", date(10, 13), date(10, 14)),
        ])
        let byTitle = Dictionary(uniqueKeysWithValues: placed.map { ($0.event.title, $0) })
        #expect(byTitle["A"]?.column == 0)
        #expect(byTitle["B"]?.column == 1)
        #expect(byTitle["C"]?.column == 1)
        #expect(byTitle["A"]?.columnCount == 2)
        #expect(byTitle["C"]?.columnCount == 2)
        #expect(byTitle["D"]?.columnCount == 1)
    }

    @Test func excludesAllDayEvents() {
        let placed = AgendaLayout.place([event("Férié", date(10, 0), date(10, 23), allDay: true)])
        #expect(placed.isEmpty)
    }

    @Test func schoolDaysSpanWholeWeeksAroundToday() {
        let wednesday = date(12, 9)
        let days = AgendaLayout.schoolDays(around: wednesday, weeksBefore: 1, weeksAfter: 1)

        #expect(days.count == 15)
        let numbers = days.map { Calendar.paris.component(.day, from: $0) }
        #expect(numbers == [3, 4, 5, 6, 7, 10, 11, 12, 13, 14, 17, 18, 19, 20, 21])
        #expect(days.allSatisfy { !Calendar.paris.isDateInWeekend($0) })
    }

    @Test func initialIndexIsTodayOnWeekdaysAndNextMondayOnWeekends() {
        let days = AgendaLayout.schoolDays(around: date(12, 9), weeksBefore: 1, weeksAfter: 1)

        #expect(AgendaLayout.initialIndex(in: days, today: date(12, 18)) == 7)
        // Saturday 15 and Sunday 16 open on Monday 17
        #expect(AgendaLayout.initialIndex(in: days, today: date(15, 10)) == 10)
        #expect(AgendaLayout.initialIndex(in: days, today: date(16, 22)) == 10)
    }

    @Test func weekendReferenceCentersOnTheUpcomingWeek() {
        let saturday = date(15, 10)
        let days = AgendaLayout.schoolDays(around: saturday, weeksBefore: 0, weeksAfter: 0)
        #expect(days.map { Calendar.paris.component(.day, from: $0) } == [17, 18, 19, 20, 21])
    }

    @Test func groupsEventsByParisDay() {
        let events = [
            event("Late", date(10, 23, 30), date(10, 23, 45)),
            event("Morning", date(10, 8), date(10, 9)),
            event("Tue", date(11, 8), date(11, 9)),
        ]
        let grouped = AgendaLayout.groupByDay(events)

        #expect(grouped[Calendar.paris.startOfDay(for: date(10, 12))]?.map(\.title) == ["Morning", "Late"])
        #expect(grouped[Calendar.paris.startOfDay(for: date(11, 12))]?.map(\.title) == ["Tue"])
    }

    @Test func filtersEventsByDay() {
        let events = [event("Mon", date(10, 8), date(10, 9)), event("Tue", date(11, 8), date(11, 9))]
        #expect(AgendaLayout.events(on: date(11, 0), from: events).map(\.title) == ["Tue"])
    }
}
