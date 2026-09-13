import SwiftUI

struct EventBlockView: View {
    let event: CalendarEvent
    let isCompact: Bool

    var body: some View {
        let colors = Theme.eventColors(event.kind)
        VStack(alignment: .leading, spacing: 2) {
            Text(event.kind == .restaurant ? "🍽️ RU" : event.title)
                .font(.caption.weight(.semibold))
                .lineLimit(isCompact ? 1 : 2)
            if !isCompact {
                Text(timeRange)
                    .font(.caption2.monospacedDigit())
                    .opacity(0.85)
                if let room = event.room, event.kind != .restaurant {
                    Text(room)
                        .font(.caption2)
                        .lineLimit(1)
                        .opacity(0.85)
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .padding(6)
        .foregroundStyle(colors.foreground)
        .background {
            RoundedRectangle(cornerRadius: 10, style: .continuous)
                .fill(colors.background)
                .overlay(alignment: .leading) {
                    UnevenRoundedRectangle(topLeadingRadius: 10, bottomLeadingRadius: 10)
                        .fill(colors.foreground.opacity(0.5))
                        .frame(width: 3)
                }
        }
        .contentShape(Rectangle())
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(event.title), \(timeRange)")
        .accessibilityAddTraits(.isButton)
    }

    private var timeRange: String {
        let style = Date.FormatStyle.dateTime.hour().minute().locale(Locale(identifier: "fr_FR"))
        return "\(event.startDate.formatted(style)) – \(event.endDate.formatted(style))"
    }
}
