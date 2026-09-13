import SwiftUI

struct AgendaView: View {
    @Environment(SettingsStore.self) private var settings
    @State private var model: AgendaViewModel
    @State private var selectedEvent: CalendarEvent?

    init(model: AgendaViewModel) {
        _model = State(initialValue: model)
    }

    var body: some View {
        NavigationStack {
            Group {
                if settings.hasValidLiseId {
                    content
                } else {
                    ContentUnavailableView {
                        Label("Aucun identifiant", systemImage: "calendar.badge.exclamationmark")
                    } description: {
                        Text("Renseigne ton identifiant Lise dans les réglages pour afficher ton emploi du temps.")
                    }
                }
            }
            .background(Theme.backgroundSecondary.ignoresSafeArea())
            .navigationTitle(weekTitle)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { toolbar }
            .sheet(item: $selectedEvent) { event in
                EventDetailSheet(event: event, campus: settings.campus)
                    .presentationDetents(event.kind == .restaurant ? [.large] : [.medium, .large])
            }
            .task(id: "\(settings.liseId)-\(settings.campus.rawValue)-\(settings.showRU)") {
                await model.load()
            }
        }
    }

    private var weekTitle: String {
        guard let first = model.weekDays.first else { return "Agenda" }
        return first.formatted(.dateTime.month(.wide).year().locale(Locale(identifier: "fr_FR"))).capitalized
    }

    @ToolbarContentBuilder
    private var toolbar: some ToolbarContent {
        ToolbarItemGroup(placement: .topBarLeading) {
            Button { withAnimation(.snappy) { model.shiftWeek(by: -1) } } label: {
                Image(systemName: "chevron.left")
            }
            .accessibilityLabel("Semaine précédente")
            Button { withAnimation(.snappy) { model.shiftWeek(by: 1) } } label: {
                Image(systemName: "chevron.right")
            }
            .accessibilityLabel("Semaine suivante")
        }
        ToolbarItem(placement: .topBarTrailing) {
            if model.state.isLoading {
                ProgressView()
            } else if model.weekOffset != 0 {
                Button("Aujourd'hui") { withAnimation(.snappy) { model.goToToday() } }
            }
        }
    }

    private var content: some View {
        VStack(spacing: 0) {
            DayStrip(days: model.weekDays, selectedIndex: $model.selectedDayIndex) { day in
                !model.events(on: day).isEmpty
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)

            if let message = model.state.errorMessage {
                ErrorBanner(message: message) { Task { await model.load() } }
                    .padding(.horizontal, 16)
                    .padding(.bottom, 8)
            }

            TabView(selection: $model.selectedDayIndex) {
                ForEach(Array(model.weekDays.enumerated()), id: \.offset) { index, day in
                    DayTimelineView(
                        day: day,
                        events: model.events(on: day),
                        isLoading: model.state.isLoading && model.state.value == nil,
                        onSelect: { selectedEvent = $0 }
                    )
                    .tag(index)
                }
            }
            .tabViewStyle(.page(indexDisplayMode: .never))
            .refreshable { await model.load() }
        }
    }
}

private struct DayStrip: View {
    let days: [Date]
    @Binding var selectedIndex: Int
    let hasEvents: (Date) -> Bool

    var body: some View {
        HStack(spacing: 6) {
            ForEach(Array(days.enumerated()), id: \.offset) { index, day in
                let isSelected = index == selectedIndex
                let isToday = Calendar.paris.isDateInToday(day)
                Button {
                    withAnimation(.snappy) { selectedIndex = index }
                } label: {
                    VStack(spacing: 4) {
                        Text(day.formatted(.dateTime.weekday(.abbreviated).locale(Locale(identifier: "fr_FR"))).capitalized)
                            .font(.caption.weight(.medium))
                        Text(day.formatted(.dateTime.day()))
                            .font(.system(.title3, design: .rounded, weight: .bold))
                        Circle()
                            .fill(hasEvents(day) ? (isSelected ? Theme.onPrimary : Theme.primary) : .clear)
                            .frame(width: 5, height: 5)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                    .foregroundStyle(isSelected ? Theme.onPrimary : (isToday ? Theme.primary : Theme.textSecondary))
                    .background {
                        RoundedRectangle(cornerRadius: 14, style: .continuous)
                            .fill(isSelected ? Theme.primary : Theme.backgroundPrimary)
                    }
                }
                .buttonStyle(.plain)
                .accessibilityLabel(day.formatted(date: .complete, time: .omitted))
                .accessibilityAddTraits(isSelected ? .isSelected : [])
            }
        }
    }
}
