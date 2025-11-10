"use server";
import fetchCookie from "fetch-cookie";
import { CookieJar } from "tough-cookie";
import prisma from "@/lib/db";
import { verifySession, deleteSession } from "@/lib/sessions";
import * as cheerio from "cheerio";
import { AbsenceType, AbsencesRequestState } from "@/lib/types";
import { getHiddenFields, navigateToLisePage } from "@/lib/helper";
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

            const $table_html = await navigateToLisePage(hiddenFields, {submenuId: "submenu_47054", buttonId: "1_0"}, jar)
            const nbrTotalAbs = $table_html('#form\\:nbrAbs').text() != "" ? parseInt($table_html('#form\\:nbrAbs').text()) : 0
            const dureeTotalAbs = $table_html('#form\\:dureeAbs').text() != "" ? $table_html('#form\\:dureeAbs').text() : "00h00"

            const rows = $table_html('#form\\:table_data > tr');
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