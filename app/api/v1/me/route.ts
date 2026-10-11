import { fail, fromResult } from "@/lib/api/respond";
import { firstIssue, profilePatchSchema, readJson } from "@/lib/api/validation";
import { withAuth } from "@/lib/api/with-auth";
import { logoutFromLise } from "@/lib/services/auth";
import { deleteAccount, getProfile, updateProfile } from "@/lib/services/user";

export const GET = withAuth(async (_request, credentials) =>
	fromResult(await getProfile(credentials.username))
);

export const PATCH = withAuth(async (request, credentials) => {
	const parsed = profilePatchSchema.safeParse(await readJson(request));
	if (!parsed.success) {
		return fail("VALIDATION", firstIssue(parsed.error));
	}
	return fromResult(await updateProfile(credentials.username, parsed.data));
});

/**
 * Deletes the Better Lise account and all data stored for it, then closes the Lise
 * session. The user's Lise (ENSAM) account is not deleted or modified.
 */
export const DELETE = withAuth(async (_request, credentials) => {
	const result = await deleteAccount(credentials.username);
	if (result.ok) {
		await logoutFromLise(credentials.jsessionId);
	}
	return fromResult(result);
});
