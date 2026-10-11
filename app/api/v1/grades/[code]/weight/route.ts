import { fail, fromResult } from "@/lib/api/respond";
import {
	firstIssue,
	gradeCodeSchema,
	readJson,
	weightVoteSchema,
} from "@/lib/api/validation";
import { withAuth } from "@/lib/api/with-auth";
import { submitWeightVote } from "@/lib/services/weights";

/** Shares the user's coefficient for a grade with the community. */
export const PUT = withAuth<{ code: string }>(async (request, credentials, context) => {
	const code = gradeCodeSchema.safeParse((await context.params).code);
	if (!code.success) {
		return fail("VALIDATION", firstIssue(code.error));
	}
	const body = weightVoteSchema.safeParse(await readJson(request));
	if (!body.success) {
		return fail("VALIDATION", firstIssue(body.error));
	}
	return fromResult(
		await submitWeightVote(credentials.username, code.data, body.data.weight)
	);
});
