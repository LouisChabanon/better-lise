import { fail, fromResult } from "@/lib/api/respond";
import { firstIssue, gradesQuerySchema } from "@/lib/api/validation";
import { withAuth } from "@/lib/api/with-auth";
import { sortGrades } from "@/lib/parsers/grades";
import { syncGrades } from "@/lib/services/grades";

export const GET = withAuth(async (request, credentials) => {
	const parsed = gradesQuerySchema.safeParse(
		Object.fromEntries(request.nextUrl.searchParams)
	);
	if (!parsed.success) {
		return fail("VALIDATION", firstIssue(parsed.error));
	}

	const result = await syncGrades(credentials, parsed.data.refresh);
	return fromResult(result, (grades) => ({ grades: sortGrades(grades) }));
});
