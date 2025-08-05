"use server";
import { cookies } from "next/headers";
import fetchCookie from "fetch-cookie";
import { CookieJar } from "tough-cookie";
import prisma from "@/lib/db";
import { verifySession, deleteSession } from "@/lib/sessions";
import * as cheerio from "cheerio";

const LISE_URI = process.env.LISE_URI || "https://lise.ensam.eu";

type Grade = {
    id: number;
    name: string;
    grade: string;
    date: string;
    isNew?: boolean;
}

type RequestState = {
    errors?: string;
    data?: Grade[];
    success: boolean;
}


function getHiddenFields($html: cheerio.CheerioAPI) {

    const viewState = $html('input[name="javax.faces.ViewState"]').val() as string;
    const formIdInit = $html('input[name="form:idInit"]').val() as string;
    const largeurDivCentre = $html('input[name="form:largeurDivCenter"]').val() as string;

    // console.log("ViewState:", encodeURIComponent(viewState));
    // console.log("FormIdInit:", encodeURIComponent(formIdInit));
    // console.log("LargeurDivCentre:", encodeURIComponent(largeurDivCentre));

    if (!viewState || !formIdInit) {
        console.error("Could not find required hidden fields in the HTML.");
        throw new Error("Required hidden fields not found");
    }

    // log all hidden fields
    // $html('input[type="hidden"]').each((_, el) => {
    //     const name = $html(el).attr('name');
    //     const value = $html(el).val();
    //     console.log(`Hidden field: ${name} = ${value}`);
    // });

    return { viewState, formIdInit, largeurDivCentre };

}


export async function getGradeData(reload: boolean = false): Promise<RequestState> {

    const grades:Grade[] = [];

    // Fetch grades from database
    
    // Don't store JSESSIONID in jwt, use db instead
    const username = (await verifySession()).username;
    if (!username) {
        console.error("No username found in session.");
        return {errors: "No username found in session.", success: false};
    }
    const user = await prisma.user.findUnique({ where: { username: username} })

    if (!user) {
        console.error("User not found in database.");
        return {errors: "User not found in database.", success: false};
    }

    if (!user.authToken) {
         return {errors: "No authentication token for user", success: false};
    }

    const db_grades = await prisma.grade.findMany({ where: { userId: user.id}})
    grades.push(...db_grades.map(g => ({id: g.id, name: g.name, grade: g.grade, date: g.date})));

    // Fetching data from Lise only if reload is true or if there are no grades in the database
    if (reload === true || db_grades.length === 0) {
        console.log("Fetching grades from Lise...");
        const jar = new CookieJar(); // Create a new cookie jar to set Lise's JSESSIONID cookie
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const fetchWithCookies = fetchCookie(fetch, jar);

        jar.setCookieSync(`JSESSIONID=${user.authToken}`, LISE_URI); // Set the JSESSIONID cookie in the cookie jar

        try {
            // Fetching home page to get grades because it's simpler.
            // /faces/LearnerNotationListPage.xhtml has more data but is a pain in the ass.
            const res = await fetchWithCookies(LISE_URI);
            const html = await res.text();
            const $html = cheerio.load(html);


            if ($html('title').text().includes('Connectez-vous') || $html('title').text().includes('Sign in')){
                console.error("User not connected or session expired")
                await deleteSession();
                return {errors: "Session has expired", success: false};
            }

        //     const { viewState, formIdInit, largeurDivCentre } = getHiddenFields($html);

        //     const res_first_req = await fetchWithCookies("https://lise.ensam.eu/faces/MainMenuPage.xhtml", {
        //         method: "POST",
        //         headers: {
        //             "Sec-Ch-Ua-Platform": "Windows",
        //             "Accept-Language": "fr-FR,fr;q=0.9",
        //             "Sec-Ch-Ua": "\"Not)A;Brand\";v=\"8\", \"Chromium\";v=\"138\"",
        //             "Sec-Ch-Ua-Mobile": "?0",
        //             "Faces-Request": "partial/ajax",
        //             "X-Requested-With": "XMLHttpRequest",
        //             "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
        //             "Accept": "application/xml, text/xml, */*; q=0.01",
        //             "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        //             "Origin": "https://lise.ensam.eu",
        //             "Sec-Fetch-Site": "same-origin",
        //             "Sec-Fetch-Mode": "cors",
        //             "Sec-Fetch-Dest": "empty",
        //             "Referer": "https://lise.ensam.eu/",
        //             "Accept-Encoding": "gzip, deflate, br",
        //             "Priority": "u=1, i"
        //         },
        //         body: `javax.faces.partial.ajax=true&javax.faces.source=form%3Aj_idt52&javax.faces.partial.execute=form%3Aj_idt52&javax.faces.partial.render=form%3Asidebar&form%3Aj_idt52=form%3Aj_idt52&webscolaapp.Sidebar.ID_SUBMENU=submenu_47356&form=form&form%3AlargeurDivCenter=${encodeURIComponent(largeurDivCentre)}&form%3AidInit=${encodeURIComponent(formIdInit)}&form%3Asauvegarde=&form%3Aj_idt789%3Aj_idt791_dropdown=1&form%3Aj_idt789%3Aj_idt791_mobiledropdown=1&form%3Aj_idt789%3Aj_idt791_page=0&form%3Aj_idt822_focus=&form%3Aj_idt822_input=44323&${encodeURIComponent(viewState)}`
        // });

        //     const html_first_req = await res_first_req.text();
        //     const $html_2 = cheerio.load(html_first_req, {xmlMode: true});

        //     const new_viewState = $html_2('update[id="j_id1:javax.faces.ViewState:0"]').text();
        //     console.log("New ViewState:", new_viewState);  

        //     const res_second_req = await fetchWithCookies("https://lise.ensam.eu/faces/MainMenuPage.xhtml", {
        //         method: "POST",
        //         headers: {
        //             "Cache-Control": "max-age=0",
        //             "Sec-Ch-Ua": "\"Not)A;Brand\";v=\"8\", \"Chromium\";v=\"138\"",
        //             "Sec-Ch-Ua-Mobile": "?0",
        //             "Sec-Ch-Ua-Platform": "\"Windows\"",
        //             "Accept-Language": "fr-FR,fr;q=0.9",
        //             "Origin": "https://lise.ensam.eu",
        //             "Content-Type": "application/x-www-form-urlencoded",
        //             "Upgrade-Insecure-Requests": "1",
        //             "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
        //             "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        //             "Sec-Fetch-Site": "same-origin",
        //             "Sec-Fetch-Mode": "navigate",
        //             "Sec-Fetch-User": "?1",
        //             "Sec-Fetch-Dest": "document",
        //             "Referer": "https://lise.ensam.eu/",
        //             "Accept-Encoding": "gzip, deflate, br",
        //             "Priority": "u=0, i"
        //         },
        //         body: `form=form&form%3AlargeurDivCenter=949&form%3AidInit=${encodeURIComponent(formIdInit)}&form%3Asauvegarde=&form%3Aj_idt789%3Aj_idt791_dropdown=1&form%3Aj_idt789%3Aj_idt791_mobiledropdown=1&form%3Aj_idt789%3Aj_idt791_page=0&form%3Aj_idt822_focus=&form%3Aj_idt822_input=44323&javax.faces.ViewState=${encodeURIComponent(new_viewState)}&form%3Asidebar=form%3Asidebar&form%3Asidebar_menuid=3_0`
        //     });

        //     const html_second_req = await res_second_req.text();
        //     console.log(html_second_req);
            // Parsing grades from the main page carroussel.
            
            $html('.ui-carousel-item').each((_, el) => {
                const grade = $html(el).find('.texteIndicateur').text().trim();
                const name = $html(el).find('.champsText2').text().trim();
                const date = $html(el).find('.champsDate').text().trim();
                grades.push({
                    id: Math.floor(Math.random() * 1000000), // Temporary ID, will be replaced by DB ID
                    name,
                    grade,
                    date,
                })
            })

            const newGrades = grades.filter(g => !db_grades.some(dbGrade => dbGrade.name === g.name && dbGrade.date === g.date && dbGrade.grade === g.grade));
            console.log("New grades found:", newGrades.length);
            await prisma.grade.createMany({
                data: newGrades.map(g => ({ ...g, userId: user.id,}))
            })
            
            // Append newGrades to the grades array with isNew flag
            newGrades.forEach(g => g.isNew = true);
            
        }catch (error) {
            console.error("Error fetching grades:", error);
            return {errors: "Error fetching grades", success: false};
        }
    }
    return { data: grades, success: true }
}