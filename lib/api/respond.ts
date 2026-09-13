import { NextResponse } from "next/server";
import { ServiceErrorCode, ServiceResult } from "@/lib/services/result";

export type ApiErrorCode =
	| ServiceErrorCode
	| "RATE_LIMITED"
	| "VALIDATION";

export type ApiEnvelope<T> = {
	success: boolean;
	data: T | null;
	error: { code: ApiErrorCode; message: string } | null;
};

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
	UNAUTHORIZED: 401,
	SESSION_EXPIRED: 401,
	INVALID_CREDENTIALS: 401,
	NOT_FOUND: 404,
	VALIDATION: 400,
	RATE_LIMITED: 429,
	LISE_UNAVAILABLE: 502,
	INTERNAL: 500,
};

const NO_STORE = { "Cache-Control": "no-store" };

export function ok<T>(data: T, status = 200) {
	return NextResponse.json<ApiEnvelope<T>>(
		{ success: true, data, error: null },
		{ status, headers: NO_STORE }
	);
}

export function fail(code: ApiErrorCode, message: string) {
	return NextResponse.json<ApiEnvelope<never>>(
		{ success: false, data: null, error: { code, message } },
		{ status: STATUS_BY_CODE[code], headers: NO_STORE }
	);
}

export function fromResult<T, R = T>(
	result: ServiceResult<T>,
	map: (data: T) => R = (data) => data as unknown as R
) {
	return result.ok ? ok(map(result.data)) : fail(result.code, result.message);
}
