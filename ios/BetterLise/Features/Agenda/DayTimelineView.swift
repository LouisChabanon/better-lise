import SwiftUI

struct DayTimelineView: View {
    let day: Date
    let events: [CalendarEvent]
    let isLoading: Bool
    let onSelect: (CalendarEvent) -> Void

    private let startHour = 7
    private let endHour = 20
    private let hourHeight: CGFloat = 64
    private let gutter: CGFloat = 48

    var body: some View {
        ScrollViewReader { proxy in
            ScrollView {
                VStack(alignment: .leading, spacing: 8) {
                    ForEach(events.filter(\.isAllDay)) { event in
                        AllDayBanner(event: event).onTapGesture { onSelect(event) }
                    }
                    .padding(.horizontal, 16)

                    ZStack(alignment: .topLeading) {
                        hourGrid
                        eventLayer
                        if Calendar.paris.isDateInToday(day) {
                            TimelineView(.everyMinute) { context in
                                nowIndicator(at: context.date)
                            }
                        }
                    }
                    .frame(height: CGFloat(endHour - startHour) * hourHeight)
                    .padding(.trailing, 12)
                    .id("timeline")
                    .overlay {
                        if isLoading {
                            ProgressView().controlSize(.large)
                        } else if events.isEmpty {
                            Text("Rien de prévu 🎉")
                                .font(.headline)
                                .foregroundStyle(Theme.textTertiary)
                                .padding(12)
                                .background(.regularMaterial, in: Capsule())
                        }
                    }
                }
                .padding(.vertical, 8)
            }
            .onAppear { proxy.scrollTo("timeline", anchor: .top) }
        }
    }

    private var hourGrid: some View {
        VStack(spacing: 0) {
            ForEach(startHour..<endHour, id: \.self) { hour in
                HStack(alignment: .top, spacing: 8) {
                    Text("\(hour)h")
                        .font(.caption2.monospacedDigit())
                        .foregroundStyle(Theme.textTertiary)
                        .frame(width: gutter - 8, alignment: .trailing)
                        .offset(y: -6)
                    Rectangle()
                        .fill(Theme.gridLine.opacity(0.6))
                        .frame(height: 0.5)
                }
                .frame(height: hourHeight, alignment: .top)
            }
        }
    }

    private var eventLayer: some View {
        GeometryReader { geometry in
            let width = geometry.size.width - gutter
            ForEach(AgendaLayout.place(events)) { placed in
                let frame = frame(for: placed, width: width)
                EventBlockView(event: placed.event, isCompact: frame.height < 44)
                    .frame(width: frame.width, height: frame.height)
                    .offset(x: frame.minX, y: frame.minY)
                    .onTapGesture { onSelect(placed.event) }
            }
        }
    }

    private func frame(for placed: PlacedEvent, width: CGFloat) -> CGRect {
        let columnWidth = width / CGFloat(placed.columnCount)
        let top = offset(for: placed.event.startDate)
        let bottom = offset(for: placed.event.endDate)
        return CGRect(
            x: gutter + CGFloat(placed.column) * columnWidth + 1,
            y: top + 1,
            width: columnWidth - 2,
            height: max(bottom - top - 2, 22)
        )
    }

    private func offset(for date: Date) -> CGFloat {
        let components = Calendar.paris.dateComponents([.hour, .minute], from: date)
        let hours = Double(components.hour ?? startHour) + Double(components.minute ?? 0) / 60
        let clamped = min(max(hours, Double(startHour)), Double(endHour))
        return CGFloat(clamped - Double(startHour)) * hourHeight
    }

    private func nowIndicator(at date: Date) -> some View {
        HStack(spacing: 0) {
            Circle().fill(Theme.danger.foreground).frame(width: 8, height: 8)
            Rectangle().fill(Theme.danger.foreground).frame(height: 1.5)
        }
        .padding(.leading, gutter - 4)
        .offset(y: offset(for: date) - 4)
        .accessibilityHidden(true)
    }
}

private struct AllDayBanner: View {
    let event: CalendarEvent

    var body: some View {
        let colors = Theme.eventColors(event.kind)
        Label(event.title, systemImage: "sun.max.fill")
            .font(.subheadline.weight(.semibold))
            .lineLimit(1)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(10)
            .foregroundStyle(colors.foreground)
            .background(colors.background, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
    }
}
