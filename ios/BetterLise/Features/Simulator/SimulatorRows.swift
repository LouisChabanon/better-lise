import SwiftUI

enum GradeFormat {
    static let french = Locale(identifier: "fr_FR")

    static func note(_ value: Double) -> String {
        value.formatted(.number.precision(.fractionLength(0...2)).locale(french))
    }

    static func average(_ value: Double) -> String {
        value.formatted(.number.precision(.fractionLength(2)).locale(french))
    }

    static func delta(_ value: Double) -> String {
        (value >= 0 ? "+" : "") + average(value)
    }
}

/// UE header: current average, and the projection once simulations exist.
struct UESummaryRow: View {
    let group: UEGroup

    var body: some View {
        let current = group.currentAverage
        let projected = group.projectedAverage
        let delta = projected - current
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .firstTextBaseline) {
                Text(group.classCode)
                    .font(.system(.title3, design: .rounded, weight: .bold))
                    .foregroundStyle(group.classCode == ClassCodeParser.unassigned ? Theme.warning.foreground : Theme.textPrimary)
                if group.semester != group.classCode {
                    Text(group.semester)
                        .font(.caption.monospaced().weight(.semibold))
                        .foregroundStyle(Theme.textTertiary)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Theme.backgroundSecondary, in: Capsule())
                }
                Spacer()
            }
            HStack(alignment: .lastTextBaseline, spacing: 0) {
                metric("Moyenne", GradeFormat.average(current), color: Theme.textPrimary)
                if group.hasSimulations {
                    Image(systemName: "arrow.right")
                        .font(.footnote.weight(.bold))
                        .foregroundStyle(Theme.textTertiary)
                        .padding(.horizontal, 12)
                        .padding(.bottom, 6)
                    metric("Projetée", GradeFormat.average(projected), color: delta >= 0 ? Theme.success.foreground : Theme.danger.foreground)
                    Spacer()
                    let badge = delta >= 0 ? Theme.success : Theme.danger
                    Text(GradeFormat.delta(delta))
                        .font(.footnote.weight(.bold).monospacedDigit())
                        .foregroundStyle(badge.foreground)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(badge.background, in: Capsule())
                        .padding(.bottom, 4)
                        .accessibilityIdentifier("projectionDelta")
                } else {
                    Spacer()
                }
            }
        }
        .padding(.vertical, 6)
        .accessibilityElement(children: .combine)
    }

    private func metric(_ label: String, _ value: String, color: Color) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label.uppercased())
                .font(.caption2.weight(.bold))
                .tracking(0.6)
                .foregroundStyle(Theme.textTertiary)
            Text(value)
                .font(.system(size: 28, weight: .heavy, design: .rounded).monospacedDigit())
                .foregroundStyle(color)
                .contentTransition(.numericText())
        }
    }
}

/// A real grade with its editable coefficient.
struct SimulatorGradeRow: View {
    let grade: SimulatorRealGrade
    let isSharing: Bool
    @Binding var coeff: Double
    var focusedCode: FocusState<String?>.Binding
    let onShare: () -> Void
    let onAssignClass: () -> Void

    var body: some View {
        let isUnassigned = ClassCodeParser.parse(grade.id).classCode == ClassCodeParser.unassigned
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                Text(grade.grade.libelle)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Theme.textPrimary)
                    .lineLimit(2)
                Button(action: onAssignClass) {
                    Label(isUnassigned ? "Non classée · assigner" : grade.id, systemImage: isUnassigned ? "exclamationmark.triangle.fill" : "tag")
                        .font(isUnassigned ? .caption.weight(.semibold) : .caption2.monospaced())
                        .foregroundStyle(isUnassigned ? Theme.warning.foreground : Theme.textTertiary)
                        .lineLimit(1)
                }
                .buttonStyle(.borderless)
            }
            Spacer(minLength: 4)
            coeffField
            let badge = Theme.gradeBadge(grade.grade.note)
            Text(GradeFormat.note(grade.grade.note))
                .font(.system(.body, design: .rounded, weight: .bold).monospacedDigit())
                .foregroundStyle(badge.foreground)
                .frame(minWidth: 48)
                .padding(.vertical, 6)
                .background(badge.background, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
        }
        .padding(.vertical, 2)
    }

    private var coeffField: some View {
        HStack(spacing: 6) {
            if isSharing {
                ProgressView().controlSize(.small)
            } else if grade.canShare {
                Button("Partager le coefficient", systemImage: "icloud.and.arrow.up.fill", action: onShare)
                    .labelStyle(.iconOnly)
                    .buttonStyle(.borderless)
                    .foregroundStyle(Theme.primary)
                    .transition(.scale.combined(with: .opacity))
            }
            VStack(spacing: 0) {
                TextField("Coeff.", value: $coeff, format: .number)
                    .keyboardType(.decimalPad)
                    .focused(focusedCode, equals: grade.id)
                    .multilineTextAlignment(.center)
                    .font(.subheadline.weight(.bold).monospacedDigit())
                    .foregroundStyle(grade.isCommunity && !grade.canShare ? Theme.primary : Theme.textSecondary)
                    .frame(width: 52)
                    .padding(.vertical, 5)
                    .background(
                        RoundedRectangle(cornerRadius: 8, style: .continuous)
                            .strokeBorder(grade.isCommunity ? Theme.primary.opacity(0.4) : Theme.gridLine, lineWidth: 1)
                    )
                Text(grade.isCommunity ? "commu." : "coeff.")
                    .font(.system(size: 9, weight: .semibold))
                    .foregroundStyle(Theme.textTertiary)
            }
            .accessibilityElement(children: .contain)
            .accessibilityLabel("Coefficient")
        }
        .animation(.snappy, value: grade.canShare)
    }
}

/// A simulated grade tuned with a slider.
struct SimulatedGradeRow: View {
    let simulation: SimulatedGrade
    @Binding var grade: Double

    var body: some View {
        let badge = Theme.gradeBadge(simulation.grade)
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 8) {
                Text("SIMULÉE")
                    .font(.system(size: 10, weight: .heavy))
                    .tracking(0.5)
                    .foregroundStyle(Theme.primary)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(Theme.primarySoft, in: Capsule())
                Text(simulation.name)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Theme.textPrimary)
                    .lineLimit(1)
                Spacer()
                Text("coeff. \(GradeFormat.note(simulation.coeff))")
                    .font(.caption)
                    .foregroundStyle(Theme.textTertiary)
            }
            HStack(spacing: 12) {
                Slider(value: $grade, in: 0...20, step: 0.5)
                    .tint(Theme.primary)
                    .accessibilityLabel("Note simulée")
                Text(GradeFormat.note(simulation.grade))
                    .font(.system(.body, design: .rounded, weight: .bold).monospacedDigit())
                    .foregroundStyle(badge.foreground)
                    .frame(minWidth: 48)
                    .padding(.vertical, 6)
                    .background(badge.background, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
                    .contentTransition(.numericText())
            }
        }
        .padding(.vertical, 4)
        .listRowBackground(
            LinearGradient(colors: [Theme.primarySoft, Theme.backgroundPrimary], startPoint: .leading, endPoint: .trailing)
        )
    }
}
