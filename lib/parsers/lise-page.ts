import type { CheerioAPI } from "cheerio";

/** Lise redirects to its CAS login page when the JSESSIONID is no longer valid. */
export function isLiseLoginPage($html: CheerioAPI): boolean {
	const title = $html("title").text();
	return title.includes("Connectez-vous") || title.includes("Sign in");
}
