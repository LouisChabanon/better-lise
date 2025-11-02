"use server";
import fetchCookie from "fetch-cookie";
import { CookieJar } from "tough-cookie";
import prisma from "@/lib/db";
import { verifySession, deleteSession } from "@/lib/sessions";
import * as cheerio from "cheerio";
import { getHiddenFields } from "@/lib/helper";
import { GradeType, RequestState } from "@/lib/types";
import logger from "@/lib/logger";

const LISE_URI = process.env.LISE_URI || "https://lise.ensam.eu";


export async function getGradeData(reload: boolean = true): Promise<RequestState> {

    const grades:GradeType[] = [];

    // Fetch grades from database
    

    const session = (await verifySession());
    if (!session.username) {
        logger.warn("User has no active session, failed to fetch grades");
        return {errors: "No username found in session.", success: false};
    }
    const user = await prisma.user.findUnique({ where: { username: session.username} })

    if (!user) {
        logger.warn("User not found in database. Failed to fetch grades", {username: session.username});
        return {errors: "User not found in database.", success: false};
    }

    const jsessionid = session.sessionId

    if(!jsessionid){
        logger.warn("No LISE session Id found in cookies", {username: session.username});
        return {errors: "Session id not found.", success: false}
    }


    const db_grades = await prisma.grade.findMany({ where: { userId: user.id}})
    //if (!reload) grades.push(...db_grades.map(g => ({code: g.code, libelle: g.name, note: g.grade, date: g.date, absence: g.absence, comment: g.comment, teachers: g.teachers})));

    // Fetching data from Lise only if reload is true or if there are no grades in the database
    if (reload === true || db_grades.length === 0) {
        logger.info("Fetching user grades from Lise.", {username: user.username});
        const jar = new CookieJar(); // Create a new cookie jar to set Lise's JSESSIONID cookie
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000); // Useless at the moment

        const fetchWithCookies = fetchCookie(fetch, jar);

        jar.setCookieSync(`JSESSIONID=${jsessionid}`, LISE_URI); // Set the JSESSIONID cookie in the cookie jar

        try {
            const res = await fetchWithCookies(LISE_URI);
            const html = await res.text();
            const $html = cheerio.load(html);


            if ($html('title').text().includes('Connectez-vous') || $html('title').text().includes('Sign in')){
                logger.warn("User session has expired on LISE", {username: user.username})
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
                    "form:j_idt849:j_idt852_start": "1761519600000",
                    "form:j_idt849:j_idt852_end": "1761606000000",
                    "form": "form",
                    "form:largeurDivCenter": "",
                    "form:idInit": `${hiddenFields.formIdInit}`,
                    "form:sauvegarde": "",
                    "form:j_idt849:j_idt852_view": "basicDay",
                    "form:j_idt814:j_idt816_dropdown": "1",
                    "form:j_idt814:j_idt816_mobiledropdown": "1",
                    "form:j_idt814:j_idt816_page": "0",
                    "javax.faces.ViewState": `${hiddenFields.viewState}`
                })})

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
                    "webscolaapp.Sidebar.ID_SUBMENU": "submenu_47356",
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

            const html_second_req = await res_second_req.text();

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
                    "form:sidebar_menuid": "4_0" 
                })
            })

            const html_third_req = await res_third_req.text();

                const $table_html = cheerio.load(html_third_req);
                const rows = $table_html('#form\\:dataTableFavori_data > tr');
                rows.each((index, element) => {
                    const cells = $table_html(element).find('td');
                    const rowData: GradeType = {
                        date: $table_html(cells.eq(0)).clone().find('ui-column-title').remove().end().text().trim(),
                        code: $table_html(cells.eq(1)).clone().find('ui-column-title').remove().end().text().trim(),
                        libelle: $table_html(cells.eq(2)).clone().find('ui-column-title').remove().end().text().trim(),
                        note: parseFloat($table_html(cells.eq(3)).clone().find('ui-column-title').remove().end().text().trim()),
                        absence: $table_html(cells.eq(4)).clone().find('ui-column-title').remove().end().text().trim(),
                        comment: $table_html(cells.eq(5)).clone().find('ui-column-title').remove().end().text().trim(),
                        teachers: $table_html(cells.eq(6)).clone().find('ui-column-title').remove().end().text().trim(),
                    }

                    // Validate required fields: date, code, libelle and a numeric note.
                    const hasDate = typeof rowData.date === 'string' && rowData.date.length > 0;
                    const hasCode = typeof rowData.code === 'string' && rowData.code.length > 0;
                    const hasLibelle = typeof rowData.libelle === 'string' && rowData.libelle.length > 0;
                    const hasNote = typeof rowData.note === 'number' && !isNaN(rowData.note);

                    if (!hasDate || !hasCode || !hasLibelle || !hasNote) {
                        // Skip malformed rows. Log for debugging.
                        logger.warn(`Skipping grade row due to missing data at index ${index}:`, { date: rowData.date, code: rowData.code, libelle: rowData.libelle, note: rowData.note });
                        
                    }else{
                        grades.push(rowData)
                    }
                })

            

            const newGrades = grades.filter(g => !db_grades.some(dbGrade => dbGrade.code === g.code));
            logger.info("Found new grades for user", {username: user.username, newGrades: newGrades.length});
            await prisma.grade.createMany({
                 data: newGrades.map(g => ({ 
                    name: g.libelle,
                    code: g.code,
                    grade: g.note,
                    date: g.date,
                    absence: g.absence,
                    comment: g.comment,
                    teachers: g.teachers,
                    userId: user.id,
                 }))
            })
            
            // // Append newGrades to the grades array with isNew flag skip if the number of new grade > 10 (looks bad)
            if(newGrades.length < 10 ){
                newGrades.forEach(g => g.isNew = true);
            }
            
        }catch (error) {
            logger.error("Error fetching user grades", {
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined
            });
            return {errors: "Error fetching grades", success: false};
        }
    }
    return { data: grades, success: true }
}