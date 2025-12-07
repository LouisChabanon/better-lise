export async function register() {
	if (process.env.NEXT_RUNTIME === "nodejs") {
		const { initSDK } = await import("@/lib/otel");

		initSDK();
	}
}
