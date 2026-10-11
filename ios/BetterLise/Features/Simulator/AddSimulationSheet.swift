import SwiftUI

struct AddSimulationSheet: View {
    let classes: [String]
    let onAdd: (_ name: String, _ grade: Double, _ coeff: Double, _ classCode: String) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var classCode = ""
    @State private var name = ""
    @State private var grade = 10.0
    @State private var coeffText = CoefficientInput.format(1)

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
                    HStack(spacing: 10) {
                        Text("Coefficient")
                        Spacer()
                        stepButton("minus", label: "Diminuer le coefficient", delta: -CoefficientInput.step)
                        TextField("1", text: $coeffText)
                            .keyboardType(.decimalPad)
                            .multilineTextAlignment(.center)
                            .font(.body.weight(.semibold).monospacedDigit())
                            .frame(width: 64)
                            .padding(.vertical, 6)
                            .background(Theme.backgroundSecondary, in: RoundedRectangle(cornerRadius: 8, style: .continuous))
                            .accessibilityLabel("Coefficient")
                            .accessibilityIdentifier("simulationCoeff")
                        stepButton("plus", label: "Augmenter le coefficient", delta: CoefficientInput.step)
                    }
                } footer: {
                    if coeff == nil {
                        Text("Coefficient invalide : un nombre entre 0 et \(Int(CoefficientInput.maximum)), par exemple 1,33.")
                            .foregroundStyle(Theme.danger.foreground)
                    } else {
                        Text("Retrouvez les coefficients de vos épreuves sur Savoir (ex : 1,33).")
                    }
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
                        guard let coeff else { return }
                        onAdd(name, grade, coeff, classCode.isEmpty ? ClassCodeParser.unassigned : classCode)
                        dismiss()
                    }
                    .disabled(coeff == nil)
                    .accessibilityIdentifier("confirmSimulation")
                }
            }
            .onAppear { if classCode.isEmpty { classCode = classes.first ?? ClassCodeParser.unassigned } }
        }
    }

    private var coeff: Double? { CoefficientInput.parse(coeffText) }

    private func stepButton(_ symbol: String, label: String, delta: Double) -> some View {
        Button(label, systemImage: symbol) {
            coeffText = CoefficientInput.format(CoefficientInput.stepped(coeff, by: delta))
        }
        .labelStyle(.iconOnly)
        .buttonStyle(.bordered)
        .buttonBorderShape(.circle)
        .tint(Theme.primary)
    }
}
