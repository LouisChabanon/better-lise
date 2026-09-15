import SwiftUI

struct AddSimulationSheet: View {
    let classes: [String]
    let onAdd: (_ name: String, _ grade: Double, _ coeff: Double, _ classCode: String) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var classCode = ""
    @State private var name = ""
    @State private var grade = 10.0
    @State private var coeff = 1.0

    var body: some View {
        NavigationStack {
            Form {
                Picker("UE", selection: $classCode) {
                    ForEach(classes, id: \.self) { Text($0).tag($0) }
                }
                TextField("Nom (ex : Rattrapage…)", text: $name)
                Section("Note") {
                    HStack(spacing: 12) {
                        Slider(value: $grade, in: 0...20, step: 0.5)
                            .tint(Theme.primary)
                            .accessibilityLabel("Note")
                        Text(GradeFormat.note(grade))
                            .font(.system(.title3, design: .rounded, weight: .bold).monospacedDigit())
                            .foregroundStyle(Theme.gradeBadge(grade).foreground)
                            .frame(minWidth: 52)
                            .contentTransition(.numericText())
                    }
                }
                Section {
                    Stepper(value: $coeff, in: 0.5...20, step: 0.5) {
                        LabeledContent("Coefficient", value: GradeFormat.note(coeff))
                    }
                } footer: {
                    Text("Retrouvez les coefficients de vos épreuves sur Savoir.")
                }
            }
            .navigationTitle("Note simulée")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Annuler") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Ajouter") {
                        onAdd(name, grade, coeff, classCode.isEmpty ? ClassCodeParser.unassigned : classCode)
                        dismiss()
                    }
                    .accessibilityIdentifier("confirmSimulation")
                }
            }
            .onAppear { if classCode.isEmpty { classCode = classes.first ?? ClassCodeParser.unassigned } }
        }
    }
}
