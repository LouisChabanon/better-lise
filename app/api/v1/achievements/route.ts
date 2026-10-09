import { fromResult } from "@/lib/api/respond";
import { withAuth } from "@/lib/api/with-auth";
import { syncAchievements } from "@/lib/services/achievements";

/**
 * Unlocks whatever the user has earned, then lists every achievement. Unlocking is
 * idempotent, so repeating the request only reports `newlyUnlocked` once.
 */
export const GET = withAuth(async (_request, credentials) =>
	fromResult(await syncAchievements(credentials.username))
);
