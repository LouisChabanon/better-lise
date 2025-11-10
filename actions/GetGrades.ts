"use server";
import fetchCookie from "fetch-cookie";
import { CookieJar } from "tough-cookie";
import prisma from "@/lib/db";
import { verifySession, deleteSession } from "@/lib/sessions";
import * as cheerio from "cheerio";
import { getHiddenFields, navigateToLisePage } from "@/lib/helper";
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

            const $table_html = await navigateToLisePage(hiddenFields, 
                {
                    submenuId: "submenu_47356",
                    buttonId: "4_0"
                }, jar)
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