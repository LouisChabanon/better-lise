"use server";

import { createSession, deleteSession } from "@/lib/sessions";
import prisma from "@/lib/db";
import { CookieJar } from "tough-cookie";
import fetchCookie from "fetch-cookie";
import logger from "@/lib/logger";

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

    logger.info("Sign-in attempt started", { username });

    if (!username || !password) {
        logger.warn("Sign-in failed: Missing credentials.", {
            username: username ? "provided" : "missing",
            password: password ? "provided" : "missing",
        });
        return { errors: "Un identifiant et un mot de passe sont requis" };
    }


    // Server side validation for username format
    if (!/^\d{4}-\d{4}$/.test(username)) {
        logger.warn("Sign-In failed: Format error", {username})
        return { errors: "L'identifiant doit être au format 20xx-xxxx" };
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
        logger.info("LISE response status received", { username, status: res.status})

        // If Lise does not redirect, it means the user does not exist
        // or the credentials are incorrect
        if (res.status === 200){
            console.log(res)
            logger.info("data: ", {text: res.text()})
            logger.warn("Sign-In failed Invalid credentials or user does not exist on LISE", { username, liseStatus: res.status})
            return { success: false, errors: "Identifiant ou mot de passe invalide (Echec de l'authentification Lise)" };
        } 

        // Need better check, currently Lise could redirect us anywhere for any reason.
        // Someone could use this
        if (res.status === 302){
            const jsessionid = jar.getCookiesSync(`${LISE_URI}`).find(cookie => cookie.key === "JSESSIONID");
            if (!jsessionid) {
                logger.error("Sign-In error: Failed to retreive JESSIONID cookie.", {username});
                return { errors: "Erreur interne: cookie de session introuvable." };
            }
            
            const user = await prisma.user.upsert({
                where: { username: username },
                update: { lastLogin: new Date()},
                create: { username: username, lastLogin: new Date() },
            })
            if (!user) {
                logger.error("Sign-In error: Failed to upsert user into database", {username})
                return { errors: "Erreur: connexion à la base de données impossible" };
            }
            await createSession(user.username, jsessionid.value);
            logger.info("Sign-In sucessfull", {username: username, userId: user.id})
            return { success: true, message: "Connexion réussie !" };
        }

    } catch (error) {
        logger.error("Unhandled error during sign-in process.", {username,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
        })
        return { errors: "Erreur interne. Veuillez réessayer plus tard." };
    }


}

export async function logOut(): Promise<void> {
    await deleteSession();
}