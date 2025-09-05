import "server-only"; // Ensure this file is only run on the server

import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const JWT_SECRET = process.env.JWT_SECRET;

export type SessionPayload = {
    username: string;
    iat: number; // issued at
    exp: number; // expiration time
}

async function encrypt(payload: SessionPayload): Promise<string> {
    if (!JWT_SECRET) {
        throw new Error("JWT_SECRET is not defined");
    }

    const jwt = await new SignJWT(payload)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt(payload.iat)
        .setExpirationTime(payload.exp)
        .sign(new TextEncoder().encode(JWT_SECRET));

    return jwt;
}


async function decrypt(token: string): Promise<SessionPayload | null> {
    if (!JWT_SECRET) {
        throw new Error("JWT_SECRET is not defined");
    }

    try {
        const { payload } = await jwtVerify(token, new TextEncoder().encode(JWT_SECRET));
        return payload as SessionPayload;
    } catch (error) {
        console.error("Failed to verify JWT:", error);
        await deleteSession(); // Delete session if verification fails
        return null; // Return null if verification fails
    }
}


export const createSession = async (username: string): Promise<string> => {
    console.log("Creating session for user:", username);
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours expiration time

    const sessionPayload: SessionPayload = {
        username,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(expiresAt.getTime() / 1000),
    }

    const jwt = await encrypt(sessionPayload);
    try {
        (await cookies()).set("jwt_token", jwt, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production", // ENABLE THIS IN PRODUCTION however it will break local development because https
        sameSite: "lax",
        path: "/",
    });
    } catch (error) {
        console.error("Failed to set cookie:", error);
    }

    return jwt;
}

export async function verifySession() {
    try {
        const cookie = (await cookies()).get("jwt_token")?.value;
        if (!cookie) {
            console.error("No session cookie found: " + cookie);
            return { isAuth: false };
        }

        const session = await decrypt(cookie);

        if (!session || !session.username) {
            console.error("Invalid session data");
            return { isAuth: false};
        }

        // Check if the session is expired
        if (session.exp < Math.floor(Date.now() / 1000)) {
            console.error("Session expired");
            await deleteSession();
            return { isAuth: false};
        }

        return { isAuth: true, username: session.username };
    } catch (e: any) {
        console.error("Error verifying session:", e.message);
        return { isAuth: false };
    }

}

export async function deleteSession() {
    (await cookies()).delete("jwt_token");
}
