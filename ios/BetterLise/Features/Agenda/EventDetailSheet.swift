import SwiftUI

struct EventDetailSheet: View {
    let event: CalendarEvent
    let campus: Campus

    var body: some View {
        let colors = Theme.eventColors(event.kind)
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    Text(event.kind.label.uppercased())
                        .font(.caption.weight(.bold))
                        .tracking(1)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 5)
                        .foregroundStyle(colors.foreground)
                        .background(colors.background, in: Capsule())

                    Text(event.kind == .restaurant ? "Menu RU · \(campus.displayName)" : event.title)
                        .font(.system(.title2, design: .rounded, weight: .bold))
                        .foregroundStyle(Theme.textPrimary)

                    VStack(alignment: .leading, spacing: 12) {
                        detailRow("clock", schedule)
                        if event.kind != .restaurant {
                            if let room = event.room { detailRow("mappin.and.ellipse", room) }
                            if let teacher = event.teacher { detailRow("person", teacher) }
                            if let group = event.group { detailRow("person.3", group) }
                        }
                    }
                    .card()

                    if event.kind == .restaurant, let summary = event.summary {
                        menu(summary)
                    }
                }
                .padding(20)
            }
            .background(Theme.backgroundSecondary.ignoresSafeArea())
        }
    }

    private var schedule: String {
        let day = event.startDate.formatted(.dateTime.weekday(.wide).day().month(.wide).locale(Locale(identifier: "fr_FR")))
        let time = Date.FormatStyle.dateTime.hour().minute().locale(Locale(identifier: "fr_FR"))
        return "\(day.capitalized) · \(event.startDate.formatted(time)) – \(event.endDate.formatted(time))"
    }

    private func detailRow(_ icon: String, _ text: String) -> some View {
        Label {
            Text(text).foregroundStyle(Theme.textSecondary)
        } icon: {
            Image(systemName: icon).foregroundStyle(Theme.primary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    /// The server formats menus as "ILOT\nitem, item" blocks separated by blank lines.
    private func menu(_ summary: String) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            ForEach(Array(summary.components(separatedBy: "\n\n").enumerated()), id: \.offset) { _, block in
                let lines = block.split(separator: "\n", maxSplits: 1).map(String.init)
                VStack(alignment: .leading, spacing: 6) {
                    Text(lines.first ?? "")
                        .font(.headline)
                        .foregroundStyle(Theme.primary)
                    if lines.count > 1 {
                        Text(lines[1].replacingOccurrences(of: ", ", with: "\n"))
                            .font(.subheadline)
                            .foregroundStyle(Theme.textSecondary)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .card()
            }
        }
    }
}
