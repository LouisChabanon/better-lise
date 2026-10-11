import { fromResult } from "@/lib/api/respond";
import { withAuth } from "@/lib/api/with-auth";
import { getCommunityWeights } from "@/lib/services/weights";

/** Community coefficients used by the grade simulator. */
export const GET = withAuth(async () =>
	fromResult(await getCommunityWeights(), (weights) => ({ weights }))
);
