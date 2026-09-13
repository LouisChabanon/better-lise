import { z } from "zod";
import { PROMO_CODES, TBKS } from "@/lib/services/user";

export const liseIdSchema = z
	.string()
	.regex(/^\d{4}-\d{4}$/, "L'identifiant doit être au format 20xx-xxxx");

export const loginSchema = z.object({
	username: liseIdSchema,
	password: z.string().min(1, "Mot de passe requis").max(256),
});

export const profilePatchSchema = z
	.object({
		class: z.enum(PROMO_CODES).optional(),
		tbk: z.enum(TBKS).optional(),
	})
	.strict()
	.refine((v) => v.class !== undefined || v.tbk !== undefined, {
		message: "Aucun champ à mettre à jour",
	});

const booleanParam = z
	.enum(["true", "false", "1", "0"])
	.transform((v) => v === "true" || v === "1");

export const agendaQuerySchema = z.object({
	liseId: liseIdSchema,
	tbk: z.enum(TBKS).default("Sibers"),
	ru: booleanParam.default("false"),
});

export const gradesQuerySchema = z.object({
	refresh: booleanParam.default("true"),
});

export const gradeCodeSchema = z.string().min(1).max(128);

export function firstIssue(error: z.ZodError): string {
	return error.issues[0]?.message ?? "Requête invalide";
}

/** Parses a JSON body, returning null when it is not valid JSON. */
export async function readJson(request: Request): Promise<unknown | null> {
	try {
		return await request.json();
	} catch {
		return null;
	}
}
