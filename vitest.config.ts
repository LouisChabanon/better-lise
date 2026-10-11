import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
	resolve: {
		alias: { "@": path.resolve(__dirname, ".") },
	},
	test: {
		environment: "node",
		include: ["__tests__/**/*.test.ts"],
		coverage: {
			provider: "v8",
			include: ["lib/api/**", "lib/parsers/**", "lib/services/**", "lib/jwt.ts", "lib/rate-limit.ts"],
			reporter: ["text-summary", "text"],
		},
	},
});
