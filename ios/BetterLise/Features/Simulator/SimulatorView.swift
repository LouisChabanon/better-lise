import SwiftUI

/// "Moyennes": what-if averages per UE, from the real grades plus simulated ones.
struct SimulatorView: View {
    @Environment(SessionStore.self) private var session
    @Bindable var model: SimulatorViewModel
    @AppStorage("simulator.helpDismissed") private var isHelpDismissed = false
    @FocusState private var focusedCode: String?
    @State private var isAddPresented = false
    @State private var gradeToAssign: SimulatorRealGrade?
    @State private var assignedClass = ""

    var body: some View {
        List {
            if let message = model.errorMessage {
                ErrorBanner(message: message) { Task { await model.loadWeights() } }
                    .listRowBackground(Color.clear)
                    .listRowInsets(EdgeInsets(top: 4, leading: 16, bottom: 4, trailing: 16))
            }
            if !isHelpDismissed {
                SimulatorHelpCard { withAnimation { isHelpDismissed = true } }
                    .listRowBackground(Color.clear)
                    .listRowInsets(EdgeInsets(top: 4, leading: 16, bottom: 4, trailing: 16))
            }
            ForEach(model.groups) { group in
                Section {
                    UESummaryRow(group: group)
                    ForEach(group.real) { grade in
                        SimulatorGradeRow(
                            grade: grade,
                            isSharing: model.sharingCodes.contains(grade.id),
                            coeff: Binding(get: { grade.effectiveCoeff }, set: { model.setLocalCoeff(code: grade.id, to: $0) }),
                            focusedCode: $focusedCode,
                            onShare: { Task { await model.shareCoeff(grade) } },
                            onAssignClass: {
                                assignedClass = ClassCodeParser.parse(grade.id).classCode
                                gradeToAssign = grade
                            }
                        )
                    }
                    ForEach(group.simulations) { simulation in
                        SimulatedGradeRow(
                            simulation: simulation,
                            grade: Binding(get: { simulation.grade }, set: { model.setSimulatedGrade(id: simulation.id, to: $0) })
                        )
                            .swipeActions {
                                Button("Supprimer", systemImage: "trash", role: .destructive) {
                                    withAnimation { model.removeSimulation(id: simulation.id) }
                                }
                            }
                    }
                }
                .listRowBackground(Theme.backgroundPrimary)
            }
            if model.groups.isEmpty {
                ContentUnavailableView(
                    "Aucune note",
                    systemImage: "function",
                    description: Text("Aucune note trouvée pour ce semestre.")
                )
                .listRowBackground(Color.clear)
            }
        }
        .scrollContentBackground(.hidden)
        .scrollDismissesKeyboard(.interactively)
        .refreshable { await model.loadWeights() }
        .toolbar {
            ToolbarItemGroup(placement: .topBarTrailing) {
                semesterMenu
                Button("Ajouter une note simulée", systemImage: "plus") { isAddPresented = true }
                    .accessibilityIdentifier("addSimulation")
            }
            ToolbarItemGroup(placement: .keyboard) {
                Spacer()
                Button("Terminé") { focusedCode = nil }
            }
        }
        .sheet(isPresented: $isAddPresented) {
            AddSimulationSheet(classes: model.availableClasses) { name, grade, coeff, classCode in
                withAnimation { model.addSimulation(name: name, grade: grade, coeff: coeff, classCode: classCode) }
            }
            .presentationDetents([.medium, .large])
        }
        .alert("Assigner à une UE", isPresented: Binding(get: { gradeToAssign != nil }, set: { if !$0 { gradeToAssign = nil } })) {
            TextField("Code de l'UE (ex : REPA)", text: $assignedClass)
                .textInputAutocapitalization(.characters)
                .autocorrectionDisabled()
            Button("Assigner") {
                if let grade = gradeToAssign { withAnimation { model.assignClass(code: grade.id, to: assignedClass) } }
            }
            Button("Annuler", role: .cancel) {}
        } message: {
            Text(gradeToAssign?.grade.libelle ?? "")
        }
        .task(id: session.username) {
            model.activate(username: session.username)
            await model.loadWeights()
        }
    }

    private var semesterMenu: some View {
        Menu {
            Picker("Semestre", selection: Binding(get: { model.semester }, set: { model.selectedSemester = $0 })) {
                ForEach(model.availableSemesters, id: \.self) { semester in
                    Text("Semestre \(semester.dropFirst())").tag(semester)
                }
                Text("Tous les semestres").tag(SimulatorGrouping.allSemesters)
            }
        } label: {
            Label(model.semester == SimulatorGrouping.allSemesters ? "Tous" : model.semester, systemImage: "calendar")
                .labelStyle(.titleAndIcon)
        }
        .accessibilityIdentifier("semesterMenu")
    }
}

private struct SimulatorHelpCard: View {
    let onDismiss: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Label("Comment ça marche ?", systemImage: "lightbulb.max.fill")
                    .font(.subheadline.weight(.bold))
                    .foregroundStyle(Theme.primary)
                Spacer()
                Button("Masquer l'aide", systemImage: "xmark", action: onDismiss)
                    .labelStyle(.iconOnly)
                    .font(.footnote.weight(.bold))
                    .foregroundStyle(Theme.textTertiary)
            }
            tip("plus.circle.fill", "Simulez", "Ajoutez des notes hypothétiques avec + pour voir leur impact sur la moyenne de l'UE.")
            tip("icloud.and.arrow.up.fill", "Participez", "Corrigez un coefficient (voir Savoir) puis partagez-le avec les autres étudiants.")
            tip("tag.fill", "Organisez", "Une note « Non classée » ? Touchez son code pour l'assigner à la bonne UE.")
        }
        .padding(14)
        .background(Theme.primarySoft, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
    }

    private func tip(_ symbol: String, _ title: String, _ text: String) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: 10) {
            Image(systemName: symbol).foregroundStyle(Theme.primary).frame(width: 18)
            Text("\(Text("\(title) :").bold().foregroundStyle(Theme.textPrimary)) \(text)")
                .font(.footnote)
                .foregroundStyle(Theme.textSecondary)
        }
    }
}
