import { describe, expect, it, vi } from "vitest";
import * as cheerio from "cheerio";
import { HOME_PAGE_HTML, LOGIN_PAGE_HTML } from "./fixtures/lise-html";

const navigateMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/utils/scraper-utils", async (importOriginal) => ({
	...(await importOriginal<object>()),
	navigateToLisePage: navigateMock,
}));

import { LISE_MENUS, openLisePage } from "@/lib/services/lise-session";

const htmlResponse = (html: string) => {
	const res = new Response(html, { status: 200 });
	Object.defineProperty(res, "url", { value: "https://lise.ensam.eu/" });
	return res;
};

describe("openLisePage", () => {
	it("returns SESSION_EXPIRED when Lise shows its login page", async () => {
		const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(htmlResponse(LOGIN_PAGE_HTML));
		expect(await openLisePage("JSID", LISE_MENUS.grades)).toMatchObject({
			ok: false,
			code: "SESSION_EXPIRED",
		});
		expect(navigateMock).not.toHaveBeenCalled();
		spy.mockRestore();
	});

	it("navigates to the requested menu with the page's hidden fields", async () => {
		const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(htmlResponse(HOME_PAGE_HTML));
		const $target = cheerio.load("<p>target</p>");
		navigateMock.mockResolvedValue($target);

		const result = await openLisePage("JSID", LISE_MENUS.absences);

		expect(result).toEqual({ ok: true, data: $target });
		expect(navigateMock).toHaveBeenCalledWith(
			{ viewState: "vs-123", formIdInit: "init-1", largeurDivCentre: "1279" },
			LISE_MENUS.absences,
			expect.anything()
		);
		spy.mockRestore();
	});
});
