import { fromResult } from "@/lib/api/respond";
import { withAuth } from "@/lib/api/with-auth";
import { markGradesOpened } from "@/lib/services/user";

export const POST = withAuth(async (_request, credentials) =>
	fromResult(await markGradesOpened(credentials.username))
);
