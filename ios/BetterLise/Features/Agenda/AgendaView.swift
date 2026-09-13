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
            } else if !model.isShowingToday {
                Button("Aujourd'hui") {
                    withAnimation(.snappy) { model.goToToday() }
                }
            }
        }
    }

    private var content: some View {
        VStack(spacing: 0) {
            WeekStrip(model: model)

            if let message = model.state.errorMessage {
                ErrorBanner(message: message) { Task { await model.load() } }
                    .padding(.horizontal, 16)
                    .padding(.bottom, 8)
            }

            DayPager(model: model, onSelect: { selectedEvent = $0 })
        }
    }
}

/// One page per school day across every loaded week: swiping past Friday lands on the next Monday.
private struct DayPager: View {
    let model: AgendaViewModel
    let onSelect: (CalendarEvent) -> Void

    /// Page the scroll view reports; the model is informed of user swipes through it.
    @State private var position: Int?

    init(model: AgendaViewModel, onSelect: @escaping (CalendarEvent) -> Void) {
        self.model = model
        self.onSelect = onSelect
        _position = State(initialValue: model.selectedIndex)
    }

    var body: some View {
        ScrollViewReader { proxy in
            ScrollView(.horizontal) {
                LazyHStack(spacing: 0) {
                    ForEach(model.days.indices, id: \.self) { index in
                        let day = model.days[index]
                        DayTimelineView(
                            day: day,
                            events: model.events(on: day),
                            isLoading: model.state.isLoading && model.state.value == nil,
                            onSelect: onSelect
                        )
                        .refreshable { await model.load() }
                        .containerRelativeFrame(.horizontal)
                        .id(index)
                        .accessibilityIdentifier("dayPage-\(index)")
                    }
                }
                .scrollTargetLayout()
            }
            .scrollTargetBehavior(.paging)
            .scrollIndicators(.hidden)
            .scrollPosition(id: $position)
            .accessibilityIdentifier("dayPager")
            .onChange(of: position) { _, index in
                if let index { model.pagerDidScroll(to: index) }
            }
            .onChange(of: model.pagerRequest) { _, request in
                guard let request else { return }
                scroll(proxy, to: request.target, from: position)
            }
        }
    }

    /// Animates short moves (within a week); jumps straight to far pages like "Aujourd'hui".
    private func scroll(_ proxy: ScrollViewProxy, to target: Int, from current: Int?) {
        if abs(target - (current ?? target)) <= 5 {
            withAnimation(.snappy) { proxy.scrollTo(target, anchor: .leading) }
        } else {
            proxy.scrollTo(target, anchor: .leading)
        }
    }
}

/// Monday–Friday chips, paged by week and kept in sync with the day pager.
private struct WeekStrip: View {
    let model: AgendaViewModel
    /// Horizontal scroll views take all proposed height, so the strip gets an explicit, Dynamic Type aware one.
    @ScaledMetric(relativeTo: .title3) private var height: CGFloat = 76

    @State private var position: Int?

    init(model: AgendaViewModel) {
        self.model = model
        _position = State(initialValue: model.visibleWeek)
    }

    var body: some View {
        ScrollViewReader { proxy in
            ScrollView(.horizontal) {
                LazyHStack(spacing: 0) {
                    ForEach(0..<model.weekCount, id: \.self) { week in
                        HStack(spacing: 6) {
                            ForEach(model.days(inWeek: week).indices, id: \.self) { index in
                                DayChip(
                                    day: model.days[index],
                                    isSelected: index == model.selectedIndex,
                                    hasEvents: !model.events(on: model.days[index]).isEmpty
                                ) {
                                    withAnimation(.snappy) { model.select(index) }
                                }
                            }
                        }
                        .padding(.horizontal, 12)
                        .containerRelativeFrame(.horizontal)
                        .id(week)
                    }
                }
                .scrollTargetLayout()
            }
            .scrollTargetBehavior(.paging)
            .scrollIndicators(.hidden)
            .scrollPosition(id: $position)
            .frame(height: height)
            .padding(.vertical, 8)
            .sensoryFeedback(.selection, trigger: model.visibleWeek)
            .accessibilityIdentifier("weekStrip")
            .onChange(of: position) { _, week in
                if let week { model.stripDidScroll(to: week) }
            }
            .onChange(of: model.stripRequest) { _, request in
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

private struct DayChip: View {
    let day: Date
    let isSelected: Bool
    let hasEvents: Bool
    let action: () -> Void

    var body: some View {
        let isToday = Calendar.paris.isDateInToday(day)
        Button(action: action) {
            VStack(spacing: 4) {
                Text(day.formatted(.dateTime.weekday(.abbreviated).locale(Locale(identifier: "fr_FR"))).capitalized)
                    .font(.caption.weight(.medium))
                Text(day.formatted(.dateTime.day()))
                    .font(.system(.title3, design: .rounded, weight: .bold))
                Circle()
                    .fill(hasEvents ? (isSelected ? Theme.onPrimary : Theme.primary) : .clear)
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
        .accessibilityIdentifier("dayChip")
        .accessibilityLabel(day.formatted(date: .complete, time: .omitted))
        .accessibilityAddTraits(isSelected ? .isSelected : [])
    }
}
