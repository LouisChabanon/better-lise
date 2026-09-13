import Foundation

/// Column placement of a timed event inside a day timeline.
struct PlacedEvent: Identifiable, Equatable {
    let event: CalendarEvent
    let column: Int
    let columnCount: Int

    var id: String { event.id }
}

enum AgendaLayout {
    /// Groups overlapping events into clusters and assigns each event the first free
    /// column of its cluster. Every event in a cluster shares the cluster's column count.
    static func place(_ events: [CalendarEvent]) -> [PlacedEvent] {
        let sorted = events
            .filter { !$0.isAllDay }
            .sorted { ($0.startDate, $0.endDate) < ($1.startDate, $1.endDate) }

        var placed: [PlacedEvent] = []
        var cluster: [(event: CalendarEvent, column: Int)] = []
        var columnEnds: [Date] = []
        var clusterEnd = Date.distantPast

        func flushCluster() {
            let count = max(columnEnds.count, 1)
            placed += cluster.map { PlacedEvent(event: $0.event, column: $0.column, columnCount: count) }
            cluster = []
            columnEnds = []
        }

        for event in sorted {
            if event.startDate >= clusterEnd, !cluster.isEmpty {
                flushCluster()
            }
            if let free = columnEnds.firstIndex(where: { $0 <= event.startDate }) {
                columnEnds[free] = event.endDate
                cluster.append((event, free))
            } else {
                columnEnds.append(event.endDate)
                cluster.append((event, columnEnds.count - 1))
            }
            clusterEnd = max(clusterEnd, event.endDate)
        }
        flushCluster()
        return placed
    }

    /// Every school day (Monday–Friday) of the week of `reference` and the surrounding weeks.
    /// On weekends the reference week is the upcoming one.
    static func schoolDays(
        around reference: Date,
        weeksBefore: Int,
        weeksAfter: Int,
        calendar: Calendar = .paris
    ) -> [Date] {
        let anchor = calendar.isDateInWeekend(reference)
            ? calendar.nextDate(after: reference, matching: DateComponents(weekday: 2), matchingPolicy: .nextTime) ?? reference
            : reference
        guard let monday = calendar.dateInterval(of: .weekOfYear, for: anchor)?.start else { return [] }

        return (-weeksBefore...weeksAfter).flatMap { week in
            (0..<5).compactMap { day in calendar.date(byAdding: .day, value: week * 7 + day, to: monday) }
        }
    }

    /// Index of today in `days`, or of the next school day when today is a weekend.
    static func initialIndex(in days: [Date], today: Date, calendar: Calendar = .paris) -> Int {
        let startOfToday = calendar.startOfDay(for: today)
        return days.firstIndex { $0 >= startOfToday } ?? max(days.count - 1, 0)
    }

    /// Events keyed by the start of their Paris calendar day, sorted by start time.
    static func groupByDay(_ events: [CalendarEvent], calendar: Calendar = .paris) -> [Date: [CalendarEvent]] {
        Dictionary(grouping: events) { calendar.startOfDay(for: $0.startDate) }
            .mapValues { $0.sorted { $0.startDate < $1.startDate } }
    }

    static func events(on day: Date, from events: [CalendarEvent], calendar: Calendar = .paris) -> [CalendarEvent] {
        events.filter { calendar.isDate($0.startDate, inSameDayAs: day) }
    }
}
