import { fail, fromResult } from "@/lib/api/respond";
import { firstIssue, gradeCodeSchema } from "@/lib/api/validation";
import { withAuth } from "@/lib/api/with-auth";
import { markGradesOpened } from "@/lib/services/user";

export const POST = withAuth<{ code: string }>(async (_request, credentials, context) => {
	const parsed = gradeCodeSchema.safeParse((await context.params).code);
	if (!parsed.success) {
		return fail("VALIDATION", firstIssue(parsed.error));
	}
	return fromResult(await markGradesOpened(credentials.username, parsed.data));
});
