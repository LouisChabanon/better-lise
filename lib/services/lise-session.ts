import * as cheerio from "cheerio";
import { CookieJar } from "tough-cookie";
import fetchCookie from "fetch-cookie";
import { getHiddenFields, navigateToLisePage } from "@/lib/utils/scraper-utils";
import { isLiseLoginPage } from "@/lib/parsers/lise-page";
import { failure, ServiceResult, success } from "./result";

const LISE_URI = process.env.LISE_URI || "https://lise.ensam.eu";

export type LiseMenuTarget = { submenuId: string; buttonId: string };

// Lise sidebar entries. These ids change when Lise updates its sidebar.
export const LISE_MENUS = {
	grades: { submenuId: "submenu_47356", buttonId: "5_0" },
	absences: { submenuId: "submenu_47054", buttonId: "1_0" },
} satisfies Record<string, LiseMenuTarget>;

/**
 * Opens a Lise page through the JSF sidebar using an existing JSESSIONID.
 * Returns SESSION_EXPIRED when Lise redirects to its login page.
 */
export async function openLisePage(
	jsessionId: string,
	target: LiseMenuTarget
): Promise<ServiceResult<cheerio.CheerioAPI>> {
	const jar = new CookieJar();
	jar.setCookieSync(`JSESSIONID=${jsessionId}`, LISE_URI);
	const fetchWithCookies = fetchCookie(fetch, jar);

	const res = await fetchWithCookies(LISE_URI);
	const $home = cheerio.load(await res.text());

	if (isLiseLoginPage($home)) {
		return failure("SESSION_EXPIRED", "Session has expired");
	}

	const hiddenFields = getHiddenFields($home);
	const $page = await navigateToLisePage(hiddenFields, target, jar);
	return success($page);
}
