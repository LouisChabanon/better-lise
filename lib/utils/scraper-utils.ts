import * as cheerio from "cheerio";
import fetchCookie from "fetch-cookie";

// Extract hidden fields form HTML page
// This is essential to send client state to server
export function getHiddenFields($html: cheerio.CheerioAPI) {
	const viewState = $html(
		'input[name="javax.faces.ViewState"]'
	).val() as string;
	const formIdInit = $html('input[name="form:idInit"]').val() as string;
	const largeurDivCentre = $html(
		'input[name="form:largeurDivCenter"]'
	).val() as string;

	if (!viewState || !formIdInit) {
		console.warn("Could not find required hidden fields in the HTML.");
		throw new Error("Required hidden fields not found");
	}

	// log all hidden fields
	// $html('input[type="hidden"]').each((_, el) => {
	// 	const name = $html(el).attr("name");
	// 	const value = $html(el).val();
	// 	console.log(`Hidden field: ${name} = ${value}`);
	// });

	return { viewState, formIdInit, largeurDivCentre };
}

// Lise scraping request
// Not sure if all the headers are necessary
// TODO: Clean headers.
export async function navigateToLisePage(
	initialHiddenFields: any,
	navigationParams: { submenuId: string; buttonId: string },
	cookiejar: any
): Promise<cheerio.CheerioAPI> {
	const fetchWithCookies = fetchCookie(fetch, cookiejar);

	const res_first_req = await fetchWithCookies(
		"https://lise.ensam.eu/faces/MainMenuPage.xhtml",
		{
			method: "POST",
			headers: {
				"Sec-Ch-Ua-Platform": "Windows",
				"Accept-Language": "fr-FR,fr;q=0.9",
				"Sec-Ch-Ua": '"Not)A;Brand";v="8", "Chromium";v="138"',
				"Sec-Ch-Ua-Mobile": "?0",
				"Faces-Request": "partial/ajax",
				"X-Requested-With": "XMLHttpRequest",
				"User-Agent":
					"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
				Accept: "application/xml, text/xml, */*; q=0.01",
				"Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
				Origin: "https://lise.ensam.eu",
				"Sec-Fetch-Site": "same-origin",
				"Sec-Fetch-Mode": "cors",
				"Sec-Fetch-Dest": "empty",
				Referer: "https://lise.ensam.eu/",
				"Accept-Encoding": "gzip, deflate, br",
				Priority: "u=1, i",
			},
			body: new URLSearchParams({
				"javax.faces.partial.ajax": "true",
				"javax.faces.source": "form:j_idt849:j_idt852",
				"javax.faces.partial.execute": "form:j_idt849:j_idt852",
				"javax.faces.partial.render": "form:j_idt849:j_idt852",
				"form:j_idt849:j_idt852": "form:j_idt849:j_idt852",
				"form:j_idt849:j_idt852_start": "1761519600000",
				"form:j_idt849:j_idt852_end": "1761606000000",
				form: "form",
				"form:largeurDivCenter": "",
				"form:idInit": `${initialHiddenFields.formIdInit}`,
				"form:sauvegarde": "",
				"form:j_idt849:j_idt852_view": "basicDay",
				"form:j_idt814:j_idt816_dropdown": "1",
				"form:j_idt814:j_idt816_mobiledropdown": "1",
				"form:j_idt814:j_idt816_page": "0",
				"javax.faces.ViewState": `${initialHiddenFields.viewState}`,
			}),
		}
	);

	const html_first_req = await res_first_req.text();
	const $html_2 = cheerio.load(html_first_req, { xmlMode: true });

	const new_viewState = $html_2(
		'update[id="j_id1:javax.faces.ViewState:0"]'
	).text();

	const res_second_req = await fetchWithCookies(
		"https://lise.ensam.eu/faces/MainMenuPage.xhtml",
		{
			method: "POST",
			headers: {
				"Cache-Control": "max-age=0",
				"Sec-Ch-Ua": '"Not)A;Brand";v="8", "Chromium";v="138"',
				"Sec-Ch-Ua-Mobile": "?0",
				"Sec-Ch-Ua-Platform": '"Windows"',
				"Accept-Language": "fr-FR,fr;q=0.9",
				Origin: "https://lise.ensam.eu",
				"Content-Type": "application/x-www-form-urlencoded",
				"Upgrade-Insecure-Requests": "1",
				"User-Agent":
					"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
				Accept:
					"text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
				"Sec-Fetch-Site": "same-origin",
				"Sec-Fetch-Mode": "navigate",
				"Sec-Fetch-User": "?1",
				"Sec-Fetch-Dest": "document",
				Referer: "https://lise.ensam.eu/",
				"Accept-Encoding": "gzip, deflate, br",
				Priority: "u=0, i",
			},
			body: new URLSearchParams({
				"javax.faces.partial.ajax": "true",
				"javax.faces.source": "form:j_idt52",
				"javax.faces.partial.execute": "form:j_idt52",
				"javax.faces.partial.render": "form:sidebar",
				"form:j_idt52": "form:j_idt52",
				"webscolaapp.Sidebar.ID_SUBMENU": `${navigationParams.submenuId}`,
				form: "form",
				"form:largeurDivCenter": "1279",
				"form:idInit": `${initialHiddenFields.formIdInit}`,
				"form:sauvegarde": "",
				"form:j_idt849:j_idt852_view": "basicDay",
				"form:j_idt814:j_idt816_dropdown": "1",
				"form:j_idt814:j_idt816_mobiledropdown": "1",
				"form:j_idt814:j_idt816_page": "0",
				"javax.faces.ViewState": `${new_viewState}`,
			}),
		}
	);

	const html_second_req = await res_second_req.text();

	const res_third_req = await fetchWithCookies(
		"https://lise.ensam.eu/faces/MainMenuPage.xhtml",
		{
			method: "POST",
			headers: {
				"Cache-Control": "max-age=0",
				"Sec-Ch-Ua": '"Chromium";v="139", "Not;A=Brand";v="99"',
				"Sec-Ch-Ua-Mobile": "?0",
				"Sec-Ch-Ua-Platform": '"Windows"',
				"Accept-Language": "fr-FR,fr;q=0.9",
				Origin: "https://lise.ensam.eu",
				"Content-Type": "application/x-www-form-urlencoded",
				"Upgrade-Insecure-Requests": "1",
				"User-Agent":
					"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36",
				Accept:
					"text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
				"Sec-Fetch-Site": "same-origin",
				"Sec-Fetch-Mode": "navigate",
				"Sec-Fetch-User": "?1",
				"Sec-Fetch-Dest": "document",
				Referer: "https://lise.ensam.eu/",
				"Accept-Encoding": "gzip, deflate, br",
				Priority: "u=0, i",
			},
			body: new URLSearchParams({
				form: "form",
				"form:largeurDivCenter": "1279",
				"form:idInit": `${initialHiddenFields.formIdInit}`,
				"form:sauvegarde": "",
				"form:j_idt849:j_idt852_view": "basicDay",
				"form:j_idt814:j_idt816_dropdown": "1",
				"form:j_idt814:j_idt816_mobiledropdown": "1",
				"form:j_idt814:j_idt816_page": "0",
				"javax.faces.ViewState": `${new_viewState}`,
				"form:sidebar": "form:sidebar",
				"form:sidebar_menuid": `${navigationParams.buttonId}`,
			}),
		}
	);

	const html_third_req = await res_third_req.text();

	return cheerio.load(html_third_req);
}
