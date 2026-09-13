import GetGradeDetails from "@/actions/GetGradeDetails";
import { fail, ok } from "@/lib/api/respond";
import { firstIssue, gradeCodeSchema } from "@/lib/api/validation";
import { withAuth } from "@/lib/api/with-auth";
import { GradeType } from "@/lib/types";

export const GET = withAuth<{ code: string }>(async (_request, _credentials, context) => {
	const parsed = gradeCodeSchema.safeParse((await context.params).code);
	if (!parsed.success) {
		return fail("VALIDATION", firstIssue(parsed.error));
	}

	const details = await GetGradeDetails({ code: parsed.data } as GradeType);
	if (!details.data) {
		return fail("INTERNAL", "Impossible de calculer les statistiques");
	}
	return ok(details.data);
});
