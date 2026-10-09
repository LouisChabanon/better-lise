import SwiftUI

/// Narrow week-column block: title first, then the start time and room when the block is tall enough.
struct EventBlockView: View {
    let event: CalendarEvent
    let height: CGFloat
    let isPast: Bool

    var body: some View {
        let colors = Theme.eventColors(event.kind)
        let shape = RoundedRectangle(cornerRadius: 8, style: .continuous)
        VStack(alignment: .leading, spacing: 1) {
            Text(event.kind == .restaurant ? "🍽️ RU" : event.title)
                .font(.caption2.weight(.semibold))
                .lineLimit(height < 36 ? 1 : 3)
            if height >= 48 {
                Text(AgendaLayout.shortTime(event.startDate))
                    .font(.caption2.monospacedDigit())
                    .lineLimit(1)
                    .opacity(0.8)
            }
            if let room = event.room, event.kind != .restaurant, height >= 64 {
                Text(room)
                    .font(.caption2)
                    .lineLimit(1)
                    .opacity(0.8)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .padding(.horizontal, 4)
        .padding(.vertical, 3)
        .foregroundStyle(colors.foreground)
        .background {
            shape
                .fill(colors.background)
                .overlay { shape.strokeBorder(colors.foreground.opacity(0.15), lineWidth: 0.5) }
        }
        .clipShape(shape)
        .opacity(isPast ? 0.55 : 1)
        // Opaque backdrop so the grid does not show through dimmed blocks
        .background(Theme.backgroundSecondary, in: shape)
        .contentShape(shape)
    }
}

/// Tapped event blocks shrink slightly, like native calendar events.
struct EventBlockPressStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.97 : 1)
            .animation(.snappy(duration: 0.15), value: configuration.isPressed)
    }
}

extension CalendarEvent {
    /// VoiceOver label of a block: title and time range.
    var accessibilitySummary: String {
        let style = Date.FormatStyle.dateTime.hour().minute().locale(Locale(identifier: "fr_FR"))
        return "\(title), \(startDate.formatted(style)) – \(endDate.formatted(style))"
    }
}
