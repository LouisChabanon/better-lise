import { ok } from "@/lib/api/respond";
import { withAuth } from "@/lib/api/with-auth";
import { logoutFromLise } from "@/lib/services/auth";

export const POST = withAuth(async (_request, credentials) => {
	await logoutFromLise(credentials.jsessionId);
	return ok({ loggedOut: true });
});
