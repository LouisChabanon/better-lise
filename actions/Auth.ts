"use server";

import { cookies } from "next/headers";
import { createSession, deleteSession } from "@/lib/sessions";
import prisma from "@/lib/db";
import { CookieJar } from "tough-cookie";
import fetchCookie from "fetch-cookie";

export type FormState = |{
    errors?: string;
    message?: string;
    success?: boolean;
} | undefined;


const LISE_URI = process.env.LISE_URI;

export async function signIn(
    state: FormState,
    formData: FormData,
): Promise<FormState> {

    const jar = new CookieJar(); // Create a new cookie jar to get Lise's JSESSIONID cookie
    const fetchWithCookies = fetchCookie(fetch, jar)
    
    const username = formData.get("username")?.toString();
    const password = formData.get("password")?.toString();

    if (!username || !password) {
        return { errors: "Username and password are required." };
    }


    // Server side validation for username format
    if (!/^\d{4}-\d{4}$/.test(username)) {
        return { errors: "Username must be in the format 20xx-xxxx" };
    }

    const params = new URLSearchParams();
    params.append("username", username);
    params.append("password", password);
    params.append("j_idt28", ""); // Don't ask me why

    // Login to Lise.ensam.eu by bypassing CAS with /login endpoint.... 
    try {
        const res = await fetchWithCookies(`${LISE_URI}/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
        redirect: "manual"
    })
        console.log("Lise Response status:", res.status);

        // If Lise does not redirect, it means the user does not exist
        // or the credentials are incorrect
        if (res.status === 200){
            return { success: false, errors: "User does not exist on lise, please use your lise credentials" };
        } 

        // Need better check, currently Lise could redirect us anywhere for any reason.
        // Someone could use this
        if (res.status === 302){
            const jsessionid = jar.getCookiesSync(`${LISE_URI}`).find(cookie => cookie.key === "JSESSIONID");
            if (!jsessionid) {
                console.error("Failed to retrieve JSESSIONID cookie.");
                return { errors: "Failed to retrieve session cookie." };
            }
            
            const user = await prisma.user.upsert({
                where: { username: username },
                update: { lastLogin: new Date(), authToken: jsessionid.value },
                create: { username: username, authToken: jsessionid.value, lastLogin: new Date() },
            })
            if (!user) {
                return { errors: "Failed to create or update user." };
            }
            await createSession(user.username);
            return { success: true, message: "Login successful!" };
        }

    } catch (error) {
        console.log("Error occurred during sign-in:", error);
        return { errors: "Internal error, please try again later." };
    }


}

export async function logOut(): Promise<void> {
    await deleteSession();
}