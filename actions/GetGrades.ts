"use server";
import { cookies } from "next/headers";
import fetchCookie from "fetch-cookie";
import { CookieJar } from "tough-cookie";
import prisma from "@/lib/db";
import { verifySession } from "@/lib/sessions";
import * as cheerio from "cheerio";

const LISE_URI = process.env.LISE_URI || "https://lise.ensam.eu";

type Grade = {
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
    grades.push(...db_grades.map(g => ({name: g.name, grade: g.grade, date: g.date})));

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
                return {errors: "Session has expired", success: false};
            }

            // Parsing grades from the main page carroussel.
            
            $html('.ui-carousel-item').each((_, el) => {
                const grade = $html(el).find('.texteIndicateur').text().trim();
                const name = $html(el).find('.champsText2').text().trim();
                const date = $html(el).find('.champsDate').text().trim();
                grades.push({
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