export type ServiceErrorCode =
	| "UNAUTHORIZED"
	| "SESSION_EXPIRED"
	| "INVALID_CREDENTIALS"
	| "NOT_FOUND"
	| "LISE_UNAVAILABLE"
	| "INTERNAL";

export type ServiceResult<T> =
	| { ok: true; data: T }
	| { ok: false; code: ServiceErrorCode; message: string };

export const success = <T>(data: T): ServiceResult<T> => ({ ok: true, data });

export const failure = <T = never>(
	code: ServiceErrorCode,
	message: string
): ServiceResult<T> => ({ ok: false, code, message });

/** Credentials extracted from a verified Better Lise session. */
export type LiseCredentials = {
	username: string;
	jsessionId: string;
};
