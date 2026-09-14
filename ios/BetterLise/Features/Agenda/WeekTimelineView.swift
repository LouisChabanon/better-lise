import SwiftUI

/// Monday–Friday on one screen: the hours fit the available height, each day is a column.
struct WeekTimelineView: View {
    let days: [Date]
    let today: Date
    /// Events of each day of `days`, in the same order.
    let events: [[CalendarEvent]]
    let isLoading: Bool
    let onSelect: (CalendarEvent) -> Void

    private let startHour = 7
    private let endHour = 20
    /// Below this, the week scrolls vertically instead of squeezing the hours further.
    private let minHourHeight: CGFloat = 44
    /// Wide enough for the current time capsule ("13h45").
    private let gutter: CGFloat = 32
    /// Keeps Friday's events off the screen edge.
    private let trailingInset: CGFloat = 4
    /// Room for the first hour label, drawn above its grid line.
    private let gridTop: CGFloat = 8
    private let hairline = Theme.gridLine.opacity(0.35)

    private var hours: Int { endHour - startHour }
    private var hasAllDayEvents: Bool { events.contains { $0.contains(where: \.isAllDay) } }
    private var todayIndex: Int? { days.firstIndex { Calendar.paris.isDate($0, inSameDayAs: today) } }

    var body: some View {
        VStack(spacing: 0) {
            header
            if hasAllDayEvents { allDayRow }
            Rectangle().fill(hairline).frame(height: 0.5)

            GeometryReader { geometry in
                let hourHeight = max(minHourHeight, (geometry.size.height - gridTop) / CGFloat(hours))
                let dayWidth = (geometry.size.width - gutter - trailingInset) / CGFloat(max(days.count, 1))

                ScrollView {
                    TimelineView(.everyMinute) { context in
                        ZStack(alignment: .topLeading) {
                            if let todayIndex {
                                todayTint(index: todayIndex, dayWidth: dayWidth, hourHeight: hourHeight)
                            }
                            hourGrid(hourHeight: hourHeight, now: todayIndex == nil ? nil : context.date)
                            ForEach(days.indices, id: \.self) { index in
                                dayEvents(index: index, now: context.date, dayWidth: dayWidth, hourHeight: hourHeight)
                            }
                            if let todayIndex {
                                nowIndicator(at: context.date, index: todayIndex, dayWidth: dayWidth, hourHeight: hourHeight)
                            }
                        }
                    }
                    .frame(width: geometry.size.width, height: hourHeight * CGFloat(hours), alignment: .topLeading)
                    .padding(.top, gridTop)
                }
                .overlay {
                    if isLoading {
                        ProgressView().controlSize(.large)
                    } else if events.allSatisfy(\.isEmpty) {
                        Text("Rien de prévu 🎉")
                            .font(.headline)
                            .foregroundStyle(Theme.textTertiary)
                            .padding(12)
                            .background(.regularMaterial, in: Capsule())
                    }
                }
            }
        }
    }

    // MARK: Header

    private var header: some View {
        HStack(spacing: 0) {
            Color.clear.frame(width: gutter, height: 1)
            ForEach(days, id: \.self) { day in
                let isToday = Calendar.paris.isDate(day, inSameDayAs: today)
                let isPastDay = !isToday && day < today
                VStack(spacing: 2) {
                    Text(weekdayLabel(day))
                        .font(.caption2.weight(.semibold))
                        .foregroundStyle(isToday ? Theme.primary : isPastDay ? Theme.textTertiary : Theme.textSecondary)
                    Text(day.formatted(.dateTime.day()))
                        .font(.system(.subheadline, design: .rounded, weight: .bold))
                        .foregroundStyle(isToday ? Theme.onPrimary : isPastDay ? Theme.textTertiary : Theme.textPrimary)
                        .frame(width: 30, height: 30)
                        .background(Circle().fill(isToday ? Theme.primary : .clear))
                }
                .frame(maxWidth: .infinity)
                .accessibilityElement(children: .ignore)
                .accessibilityLabel(day.formatted(date: .complete, time: .omitted))
                .accessibilityIdentifier("dayHeader")
                .accessibilityAddTraits(isToday ? .isSelected : [])
            }
            Color.clear.frame(width: trailingInset, height: 1)
        }
        .padding(.vertical, 4)
    }

    private func weekdayLabel(_ day: Date) -> String {
        day.formatted(.dateTime.weekday(.abbreviated).locale(Locale(identifier: "fr_FR")))
            .replacingOccurrences(of: ".", with: "")
            .capitalized
    }

    private var allDayRow: some View {
        HStack(alignment: .top, spacing: 0) {
            Color.clear.frame(width: gutter, height: 1)
            ForEach(days.indices, id: \.self) { index in
                VStack(spacing: 2) {
                    ForEach(events[index].filter(\.isAllDay)) { event in
                        let colors = Theme.eventColors(event.kind)
                        Text(event.title)
                            .font(.caption2.weight(.semibold))
                            .lineLimit(1)
                            .padding(.horizontal, 4)
                            .padding(.vertical, 2)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .foregroundStyle(colors.foreground)
                            .background(colors.background, in: RoundedRectangle(cornerRadius: 6, style: .continuous))
                            .onTapGesture { onSelect(event) }
                    }
                }
                .padding(.horizontal, 1)
                .frame(maxWidth: .infinity)
            }
            Color.clear.frame(width: trailingInset, height: 1)
        }
        .padding(.bottom, 4)
    }

    // MARK: Grid

    /// `now` is set when the week shows today: labels next to the current time give way to it.
    private func hourGrid(hourHeight: CGFloat, now: Date?) -> some View {
        VStack(spacing: 0) {
            ForEach(startHour..<endHour, id: \.self) { hour in
                HStack(alignment: .top, spacing: 0) {
                    let hidesLabel = hour == startHour || now.map { AgendaLayout.isHourLabelNearNow(hour, now: $0) } == true
                    Text(hidesLabel ? "" : "\(hour)h")
                        .font(.caption2.monospacedDigit())
                        .foregroundStyle(Theme.textTertiary)
                        .lineLimit(1)
                        .frame(width: gutter - 6, alignment: .trailing)
                        .padding(.trailing, 6)
                        .offset(y: -7)
                    // The first line would double the hairline under the header
                    Rectangle()
                        .fill(hour == startHour ? .clear : hairline)
                        .frame(height: 0.5)
                        .padding(.trailing, trailingInset)
                }
                .frame(height: hourHeight, alignment: .top)
            }
        }
        .accessibilityHidden(true) // decoration: events carry their own time in their label
    }

    /// Soft wash behind today's column, anchoring the eye without drawing lines.
    private func todayTint(index: Int, dayWidth: CGFloat, hourHeight: CGFloat) -> some View {
        Rectangle()
            .fill(Theme.primary.opacity(0.05))
            .frame(width: dayWidth, height: hourHeight * CGFloat(hours))
            .offset(x: gutter + CGFloat(index) * dayWidth)
            .accessibilityHidden(true)
    }

    /// Timed events of one day, sharing the day column when they overlap.
    private func dayEvents(index: Int, now: Date, dayWidth: CGFloat, hourHeight: CGFloat) -> some View {
        ForEach(AgendaLayout.place(events[index])) { placed in
            let frame = frame(for: placed, dayIndex: index, dayWidth: dayWidth, hourHeight: hourHeight)
            Button { onSelect(placed.event) } label: {
                EventBlockView(event: placed.event, height: frame.height, isPast: AgendaLayout.isPast(placed.event, now: now))
            }
            .buttonStyle(EventBlockPressStyle())
            .frame(width: frame.width, height: frame.height)
            .offset(x: frame.minX, y: frame.minY)
            .accessibilityLabel(placed.event.accessibilitySummary)
            .accessibilityIdentifier("eventBlock")
        }
    }

    private func frame(for placed: PlacedEvent, dayIndex: Int, dayWidth: CGFloat, hourHeight: CGFloat) -> CGRect {
        let columnWidth = dayWidth / CGFloat(placed.columnCount)
        let top = offset(for: placed.event.startDate, hourHeight: hourHeight)
        let bottom = offset(for: placed.event.endDate, hourHeight: hourHeight)
        return CGRect(
            x: gutter + CGFloat(dayIndex) * dayWidth + CGFloat(placed.column) * columnWidth + 1.5,
            y: top + 1,
            width: columnWidth - 3,
            height: max(bottom - top - 2, 18)
        )
    }

    private func offset(for date: Date, hourHeight: CGFloat) -> CGFloat {
        let components = Calendar.paris.dateComponents([.hour, .minute], from: date)
        let hours = Double(components.hour ?? startHour) + Double(components.minute ?? 0) / 60
        let clamped = min(max(hours, Double(startHour)), Double(endHour))
        return CGFloat(clamped - Double(startHour)) * hourHeight
    }

    // MARK: Now

    /// Faint line across the week, strong on today's column, and the time in the gutter.
    @ViewBuilder
    private func nowIndicator(at date: Date, index: Int, dayWidth: CGFloat, hourHeight: CGFloat) -> some View {
        let hour = Calendar.paris.component(.hour, from: date)
        if hour >= startHour, hour < endHour {
            let y = offset(for: date, hourHeight: hourHeight)
            let color = Theme.danger.foreground
            let weekWidth = dayWidth * CGFloat(days.count)

            Group {
                // Time first so its background never covers the dot
                Text(AgendaLayout.shortTime(date))
                    .font(.system(size: 9, weight: .bold).monospacedDigit())
                    .foregroundStyle(color)
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
                    .padding(.horizontal, 1)
                    .padding(.vertical, 1)
                    .background(Theme.backgroundSecondary, in: Capsule())
                    .frame(width: gutter - 3, alignment: .trailing)
                    .offset(y: y - 7)
                Rectangle()
                    .fill(color.opacity(0.25))
                    .frame(width: weekWidth, height: 1)
                    .offset(x: gutter, y: y - 0.5)
                Rectangle()
                    .fill(color)
                    .frame(width: dayWidth, height: 1.5)
                    .offset(x: gutter + CGFloat(index) * dayWidth, y: y - 0.75)
                Circle()
                    .fill(color)
                    .frame(width: 8, height: 8)
                    .padding(1.5)
                    .background(Circle().fill(Theme.backgroundSecondary))
                    .offset(x: gutter + CGFloat(index) * dayWidth - 5.5, y: y - 5.5)
            }
            .accessibilityHidden(true)
        }
    }
}
