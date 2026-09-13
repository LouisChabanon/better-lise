import { fromResult } from "@/lib/api/respond";
import { withAuth } from "@/lib/api/with-auth";
import { fetchAbsences } from "@/lib/services/absences";

export const GET = withAuth(async (_request, credentials) =>
	fromResult(await fetchAbsences(credentials))
);
