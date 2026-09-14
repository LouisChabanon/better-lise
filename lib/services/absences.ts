import logger from "@/lib/logger";
import courseData from "@/ue_data.json";
import { parseAbsencesPage, ParsedAbsences } from "@/lib/parsers/absences";
import { demoAbsences, isDemoUsername } from "./demo";
import { failure, LiseCredentials, ServiceResult, success } from "./result";
import { LISE_MENUS, openLisePage } from "./lise-session";

/** Scrapes the user's absences from Lise and computes per-UE statistics. */
export async function fetchAbsences(
	credentials: LiseCredentials
): Promise<ServiceResult<ParsedAbsences>> {
	if (isDemoUsername(credentials.username)) {
		return success(demoAbsences(new Date()));
	}
	logger.info("Fetching absences from Lise", { username: credentials.username });

	try {
		const page = await openLisePage(credentials.jsessionId, LISE_MENUS.absences);
		if (!page.ok) {
			logger.warn("User session has expired on LISE", {
				username: credentials.username,
			});
			return page;
		}

		const parsed = parseAbsencesPage(page.data, courseData.course_weights);
		logger.info("Sucessfully fetched absences", {
			user: credentials.username,
			nbrTotalAbs: parsed.nbTotalAbsences,
			dureeTotalAbs: parsed.dureeTotaleAbsences,
		});
		return success(parsed);
	} catch (error) {
		logger.error("Error fetching absences", {
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
		});
		return failure("LISE_UNAVAILABLE", "Error fetching absences");
	}
}
