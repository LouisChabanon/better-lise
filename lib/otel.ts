import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { BatchLogRecordProcessor } from "@opentelemetry/sdk-logs";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";

export function initSDK() {
	const sdk = new NodeSDK({
		resource: resourceFromAttributes({
			[ATTR_SERVICE_NAME]: "better-lise-service",
		}),
		logRecordProcessor: new BatchLogRecordProcessor(
			new OTLPLogExporter({
				url: `${process.env.NEXT_PUBLIC_POSTHOG_HOST}/i/v1/logs`,
				headers: {
					Authorization: `Bearer ${process.env.NEXT_PUBLIC_POSTHOG_KEY}`,
				},
			})
		),
	});

	sdk.start();
	console.log("PostHog OTel Logger Initialized");
}
