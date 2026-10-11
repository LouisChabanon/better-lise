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
        model.visibleWeekStart
            .formatted(.dateTime.month(.wide).year().locale(Locale(identifier: "fr_FR")))
            .capitalized
    }

    @ToolbarContentBuilder
    private var toolbar: some ToolbarContent {
        ToolbarItem(placement: .topBarTrailing) {
            if model.state.isLoading {
                ProgressView()
            } else if !model.isShowingCurrentWeek {
                Button("Aujourd'hui") {
                    withAnimation(.snappy) { model.goToToday() }
                }
            }
        }
    }

    private var content: some View {
        VStack(spacing: 0) {
            if let message = model.state.errorMessage {
                ErrorBanner(message: message) { Task { await model.load() } }
                    .padding(.horizontal, 16)
                    .padding(.bottom, 8)
            }

            WeekPager(model: model, onSelect: { selectedEvent = $0 })
        }
    }
}

/// One page per school week (Monday–Friday), like the web agenda.
private struct WeekPager: View {
    let model: AgendaViewModel
    let onSelect: (CalendarEvent) -> Void

    /// Page the scroll view reports; the model is informed of user swipes through it.
    @State private var position: Int?

    init(model: AgendaViewModel, onSelect: @escaping (CalendarEvent) -> Void) {
        self.model = model
        self.onSelect = onSelect
        _position = State(initialValue: model.visibleWeek)
    }

    var body: some View {
        ScrollViewReader { proxy in
            ScrollView(.horizontal) {
                LazyHStack(spacing: 0) {
                    ForEach(0..<model.weekCount, id: \.self) { week in
                        let days = Array(model.days(inWeek: week))
                        WeekTimelineView(
                            days: days,
                            today: model.today,
                            events: days.map { model.events(on: $0) },
                            isLoading: model.state.isLoading && model.state.value == nil,
                            onSelect: onSelect
                        )
                        .refreshable { await model.load() }
                        .containerRelativeFrame(.horizontal)
                        .id(week)
                    }
                }
                .scrollTargetLayout()
            }
            .scrollTargetBehavior(.paging)
            .scrollIndicators(.hidden)
            .scrollPosition(id: $position)
            .sensoryFeedback(.selection, trigger: model.visibleWeek)
            .accessibilityIdentifier("weekPager")
            .onChange(of: position) { _, week in
                if let week { model.pagerDidScroll(toWeek: week) }
            }
            .onChange(of: model.pagerRequest) { _, request in
                guard let request else { return }
                if abs(request.target - (position ?? request.target)) <= 1 {
                    withAnimation(.snappy) { proxy.scrollTo(request.target, anchor: .leading) }
                } else {
                    proxy.scrollTo(request.target, anchor: .leading)
                }
            }
        }
    }
}
