"use server";
import fetchCookie from "fetch-cookie";
import { CookieJar } from "tough-cookie";
import prisma from "@/lib/db";
import { verifySession, deleteSession } from "@/lib/sessions";
import * as cheerio from "cheerio";
import { AbsenceType, AbsencesRequestState } from "@/lib/types";
import { getHiddenFields } from "@/lib/helper";
import logger from "@/lib/logger";

const LISE_URI = process.env.LISE_URI || "https://lise.ensam.eu";

export async function getAbsenceData(reload: boolean = true): Promise<AbsencesRequestState> {

    const absences: AbsenceType[] = [];

    const session = (await verifySession());
    if(!session.username){
        logger.warn("User has no active session, failed to fetch absences")
        return {errors: "No username found in session.", success: false};
    }

    // const user = await prisma.user.findUnique({ where: { username: session.username} })

    // if (!user) {
    //     console.warn("User not found in database.");
    //     return {errors: "User not found in database.", success: false};
    // }

    const jsessionid = session.sessionId

    if(!jsessionid){
        console.error("No Lise session Id found in cookie");
        return {errors: "Session id not found.", success: false}
    }


    //const db_absences = await prisma.absence.findMany({where: {userId: user.id}})
    //if (!reload) absences.push(db_absences)

    if(reload === true){
        logger.info("Fetching absences from Lise", {username: session.username})

        const jar = new CookieJar();
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const fetchWithCookies = fetchCookie(fetch, jar);

        jar.setCookieSync(`JSESSIONID=${jsessionid}`, LISE_URI);

        try {
            const res = await fetchWithCookies(LISE_URI);
            const html = await res.text();
            const $html = cheerio.load(html);
            
            
            if ($html('title').text().includes('Connectez-vous') || $html('title').text().includes('Sign in')){
                logger.error("User session has expired on LISE", {username: session.username})
                await deleteSession();
                return {errors: "Session has expired", success: false};
            }
            
            const hiddenFields = getHiddenFields($html);

            const res_first_req = await fetchWithCookies("https://lise.ensam.eu/faces/MainMenuPage.xhtml", {
                method: "POST",
                headers: {
                    "Sec-Ch-Ua-Platform": "Windows",
                    "Accept-Language": "fr-FR,fr;q=0.9",
                    "Sec-Ch-Ua": "\"Not)A;Brand\";v=\"8\", \"Chromium\";v=\"138\"",
                    "Sec-Ch-Ua-Mobile": "?0",
                    "Faces-Request": "partial/ajax",
                    "X-Requested-With": "XMLHttpRequest",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
                    "Accept": "application/xml, text/xml, */*; q=0.01",
                    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                    "Origin": "https://lise.ensam.eu",
                    "Sec-Fetch-Site": "same-origin",
                    "Sec-Fetch-Mode": "cors",
                    "Sec-Fetch-Dest": "empty",
                    "Referer": "https://lise.ensam.eu/",
                    "Accept-Encoding": "gzip, deflate, br",
                    "Priority": "u=1, i"
                },
                body: new URLSearchParams({
                    "javax.faces.partial.ajax": "true",
                    "javax.faces.source": "form:j_idt849:j_idt852",
                    "javax.faces.partial.execute": "form:j_idt849:j_idt852",
                    "javax.faces.partial.render": "form:j_idt849:j_idt852",
                    "form:j_idt849:j_idt852": "form:j_idt849:j_idt852",
                    "form:j_idt849:j_idt852_start": "1761692400000",
                    "form:j_idt849:j_idt852_end": "1761778800000",
                    "form": "form",
                    "form:largeurDivCenter": "",
                    "form:idInit": `${hiddenFields.formIdInit}`,
                    "form:sauvegarde": "",
                    "form:j_idt849:j_idt852_view": "basicDay",
                    "form:j_idt814:j_idt816_dropdown": "1",
                    "form:j_idt814:j_idt816_mobiledropdown": "1",
                    "form:j_idt814:j_idt816_page": "0",
                    "javax.faces.ViewState": `${hiddenFields.viewState}`
            })
        })

            const html_first_req = await res_first_req.text();
            const $html_2 = cheerio.load(html_first_req, {xmlMode: true});

            const new_viewState = $html_2('update[id="j_id1:javax.faces.ViewState:0"]').text();

            const res_second_req = await fetchWithCookies("https://lise.ensam.eu/faces/MainMenuPage.xhtml", {
                method: "POST",
                headers: {
                    "Cache-Control": "max-age=0",
                    "Sec-Ch-Ua": "\"Not)A;Brand\";v=\"8\", \"Chromium\";v=\"138\"",
                    "Sec-Ch-Ua-Mobile": "?0",
                    "Sec-Ch-Ua-Platform": "\"Windows\"",
                    "Accept-Language": "fr-FR,fr;q=0.9",
                    "Origin": "https://lise.ensam.eu",
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Upgrade-Insecure-Requests": "1",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                    "Sec-Fetch-Site": "same-origin",
                    "Sec-Fetch-Mode": "navigate",
                    "Sec-Fetch-User": "?1",
                    "Sec-Fetch-Dest": "document",
                    "Referer": "https://lise.ensam.eu/",
                    "Accept-Encoding": "gzip, deflate, br",
                    "Priority": "u=0, i"
                },
                body: new URLSearchParams({
                    "javax.faces.partial.ajax": "true",
                    "javax.faces.source": "form:j_idt52",
                    "javax.faces.partial.execute": "form:j_idt52",
                    "javax.faces.partial.render": "form:sidebar",
                    "form:j_idt52": "form:j_idt52",
                    "webscolaapp.Sidebar.ID_SUBMENU": "submenu_47054",
                    "form": "form",
                    "form:largeurDivCenter": "1279",
                    "form:idInit": `${hiddenFields.formIdInit}`,
                    "form:sauvegarde": "",
                    "form:j_idt849:j_idt852_view": "basicDay",
                    "form:j_idt814:j_idt816_dropdown": "1",
                    "form:j_idt814:j_idt816_mobiledropdown": "1",
                    "form:j_idt814:j_idt816_page": "0",
                    "javax.faces.ViewState": `${new_viewState}`
                })
            });

            const res_third_req = await fetchWithCookies("https://lise.ensam.eu/faces/MainMenuPage.xhtml", {
                    method: "POST",
                    headers: {
                        "Cache-Control": "max-age=0",
                        "Sec-Ch-Ua": "\"Chromium\";v=\"139\", \"Not;A=Brand\";v=\"99\"",
                        "Sec-Ch-Ua-Mobile": "?0",
                        "Sec-Ch-Ua-Platform": "\"Windows\"",
                        "Accept-Language": "fr-FR,fr;q=0.9",
                        "Origin": "https://lise.ensam.eu",
                        "Content-Type": "application/x-www-form-urlencoded",
                        "Upgrade-Insecure-Requests": "1",
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36",
                        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                        "Sec-Fetch-Site": "same-origin",
                        "Sec-Fetch-Mode": "navigate",
                        "Sec-Fetch-User": "?1",
                        "Sec-Fetch-Dest": "document",
                        "Referer": "https://lise.ensam.eu/",
                        "Accept-Encoding": "gzip, deflate, br",
                        "Priority": "u=0, i"
                    },
                    body: new URLSearchParams({
                    "form": "form",
                        "form:largeurDivCenter": "1279",
                        "form:idInit": `${hiddenFields.formIdInit}`,
                        "form:sauvegarde": "",
                        "form:j_idt849:j_idt852_view": "basicDay",
                        "form:j_idt814:j_idt816_dropdown": "1",
                        "form:j_idt814:j_idt816_mobiledropdown": "1",
                        "form:j_idt814:j_idt816_page": "0",
                        "javax.faces.ViewState": `${new_viewState}`,
                        "form:sidebar": "form:sidebar",
                        "form:sidebar_menuid": "1_0" 
                    })
                })

                const html_third_req = await res_third_req.text();

                const $table_html = cheerio.load(html_third_req);
                const nbrTotalAbs = $table_html('#form\\:nbrAbs').text() != "" ? parseInt($table_html('#form\\:nbrAbs').text()) : 0
                const dureeTotalAbs = $table_html('#form\\:dureeAbs').text() != "" ? $table_html('#form\\:dureeAbs').text() : "00h00"

                const rows = $table_html('#form\\:table_data');
                rows.each((index, element) => {
                    const cells = $table_html(element).find('td');

                    // If no absences, date is set to "Aucune absence." Fine for now but it's not pretty
                    const rowData: AbsenceType = {
                        date: $table_html(cells.eq(0)).clone().text().trim(),
                        motif: $table_html(cells.eq(1)).clone().text().trim(),
                        duree: $table_html(cells.eq(2)).clone().text().trim(),
                        horaire: $table_html(cells.eq(3)).clone().text().trim(),
                        cours: $table_html(cells.eq(4)).clone().text().trim(),
                        intervenants: $table_html(cells.eq(5)).clone().text().trim(),
                        matiere: $table_html(cells.eq(6)).clone().text().trim()
                    }

                    absences.push(rowData);
                })

            
            logger.info("Sucessfully fetched absences", {user: session.username, nbrTotalAbs, dureeTotalAbs});
            return {success: true, data: {nbTotalAbsences: nbrTotalAbs, dureeTotaleAbsences: dureeTotalAbs, absences}}
            
        }catch(error){
            logger.error("Error fetching absences: ", {
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined
            })
            return {errors: "Error fetch absences", success: false}
        }
    }
    return {errors: "Feature is not ready yet", success: false}
}