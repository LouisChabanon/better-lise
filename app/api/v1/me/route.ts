import { fail, fromResult } from "@/lib/api/respond";
import { firstIssue, profilePatchSchema, readJson } from "@/lib/api/validation";
import { withAuth } from "@/lib/api/with-auth";
import { getProfile, updateProfile } from "@/lib/services/user";

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
