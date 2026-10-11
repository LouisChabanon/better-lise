export const LOGIN_PAGE_HTML = `<html><head><title>Connectez-vous - CAS</title></head><body></body></html>`;

export const HOME_PAGE_HTML = `<html><head><title>Lise</title></head><body>
<form id="form">
<input type="hidden" name="javax.faces.ViewState" value="vs-123" />
<input type="hidden" name="form:idInit" value="init-1" />
<input type="hidden" name="form:largeurDivCenter" value="1279" />
</form></body></html>`;

const gradeRow = (cells: string[]) =>
	`<tr>${cells.map((c) => `<td>${c}</td>`).join("")}</tr>`;

export const GRADES_TABLE_HTML = `<html><body><table><tbody id="form:dataTableFavori_data">
${gradeRow(["12/01/2025", "FITE_S7_MATA_DS1", "DS Matériaux", "15,5", "", "", "M. Morel"])}
${gradeRow(["03/02/2025", "FITE_S7_MDSA_DS1", "DS Mécanique", "9", "", "Bof", "Mme Dupont"])}
${gradeRow(["", "", "", "", "", "", ""])}
${gradeRow(["05/02/2025", "FITE_S7_EEAA_TP", "TP EEA", "ABS", "Oui", "", ""])}
</tbody></table></body></html>`;

export const ABSENCES_PAGE_HTML = `<html><body>
<span id="form:nbrAbs">3</span><span id="form:dureeAbs">06h00</span>
<table><tbody id="form:table_data">
${gradeRow(["10/01/2025", "Non excusé", "02:00", "08h00-10h00", "GIM2 Mecanique des solides", "M. X", "Mécanique"])}
${gradeRow(["11/01/2025", "", "02:30", "10h00-12h30", "GIM2 Mecanique des solides TD", "M. X", "Mécanique"])}
${gradeRow(["12/01/2025", "Certificat médical", "01:30", "14h00-15h30", "GIM2 Materiaux", "Mme Y", "Matériaux"])}
${gradeRow(["13/01/2025", "", "01:00", "14h00-15h00", "Cours inconnu", "Mme Z", "Autre"])}
</tbody></table></body></html>`;

export const NO_ABSENCES_PAGE_HTML = `<html><body>
<table><tbody id="form:table_data">
<tr><td>Aucune absence.</td></tr>
</tbody></table></body></html>`;
