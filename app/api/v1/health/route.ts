import { getLiseHealth } from "@/actions/GetLiseHealth";
import { fail, ok } from "@/lib/api/respond";
import logger from "@/lib/logger";

export async function GET() {
	try {
		return ok(await getLiseHealth());
	} catch (error) {
		logger.error("Failed to compute Lise health", {
			error: error instanceof Error ? error.message : String(error),
		});
		return fail("INTERNAL", "Statut indisponible");
	}
}
