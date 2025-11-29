export function liseIdChecker(liseId: string): boolean {
	const regex = /^\d{4}-\d{4}$/;
	return regex.test(liseId);
}
