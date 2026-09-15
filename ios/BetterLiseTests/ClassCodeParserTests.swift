import Testing
@testable import BetterLise

struct ClassCodeParserTests {
    @Test(arguments: [
        ("FITE_S7_EEAA_DS1", "S7", "EEAA"),
        ("FITE_S8_GIM2_REPA_TP", "S8", "REPA"),
        ("FITE_S6_EXP_MECA_EXAM", "S6", "MECA"),
        ("FITE_S8_GIM2_ED1_ORIA", "S8", "ORIA"),
        ("FITE_S8_GIM2_ED1", "S8", "Autre"),
        ("FITE_S8_GIM2", "Autre", "Autre"),
        ("FITE_S8_GIM2_", "Autre", "Autre"),
        ("DEMO_S8_REPA_TP2", "S8", "REPA"),
        ("MATA", "Autre", "Autre"),
        ("FITE_S5", "Autre", "Autre"),
    ])
    func parsesSemesterAndUE(code: String, semester: String, classCode: String) {
        #expect(ClassCodeParser.parse(code) == ParsedClassCode(semester: semester, classCode: classCode))
    }

    @Test func extractsSemesterNumbers() {
        #expect(ClassCodeParser.semesterNumber("S10") == 10)
        #expect(ClassCodeParser.semesterNumber("s7") == 7)
        #expect(ClassCodeParser.semesterNumber("Autre") == 0)
    }
}
