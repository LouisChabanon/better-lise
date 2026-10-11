import { NextRequest } from "next/server";
import { verifyToken } from "@/lib/jwt";
import logger from "@/lib/logger";
import { LiseCredentials } from "@/lib/services/result";
import { fail } from "./respond";

type RouteContext<P> = { params: Promise<P> };

type AuthedHandler<P> = (
	request: NextRequest,
	credentials: LiseCredentials,
	context: RouteContext<P>
) => Promise<Response>;

export function extractBearer(header: string | null): string | null {
	if (!header) return null;
	const match = header.match(/^Bearer\s+(\S+)$/i);
	return match ? match[1] : null;
}

/** Guards a route handler with the `Authorization: Bearer <jwt>` header. */
export function withAuth<P = Record<string, never>>(handler: AuthedHandler<P>) {
	return async (request: NextRequest, context: RouteContext<P>) => {
		const token = extractBearer(request.headers.get("authorization"));
		if (!token) {
			return fail("UNAUTHORIZED", "Missing bearer token");
		}

		const session = await verifyToken(token);
		if (!session) {
			return fail("UNAUTHORIZED", "Invalid or expired token");
		}

		try {
			return await handler(
				request,
				{ username: session.username, jsessionId: session.authToken },
				context
			);
		} catch (error) {
			logger.error("Unhandled API error", {
				path: request.nextUrl.pathname,
				error: error instanceof Error ? error.message : String(error),
			});
			return fail("INTERNAL", "Erreur interne");
		}
	};
}
