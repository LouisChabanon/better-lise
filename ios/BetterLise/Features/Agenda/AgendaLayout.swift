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

    /// Monday–Friday of the week containing `reference`, shifted by `weekOffset` weeks.
    static func weekDays(containing reference: Date, weekOffset: Int, calendar: Calendar = .paris) -> [Date] {
        guard let shifted = calendar.date(byAdding: .weekOfYear, value: weekOffset, to: reference),
              let monday = calendar.dateInterval(of: .weekOfYear, for: shifted)?.start else {
            return []
        }
        return (0..<5).compactMap { calendar.date(byAdding: .day, value: $0, to: monday) }
    }

    static func events(on day: Date, from events: [CalendarEvent], calendar: Calendar = .paris) -> [CalendarEvent] {
        events.filter { calendar.isDate($0.startDate, inSameDayAs: day) }
    }
}
