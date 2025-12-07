import { logs, SeverityNumber } from "@opentelemetry/api-logs";

const loggerProvider = logs.getLogger("better-lise-logger");

const emitLog = (
	level: SeverityNumber,
	severityText: string,
	message: string,
	attributes: Record<string, any> = {}
) => {
	// Emit to OpenTelemetry (PostHog)
	loggerProvider.emit({
		body: message,
		severityNumber: level,
		severityText: severityText,
		attributes: attributes,
	});

	// Keep console output for local development visibility
	if (process.env.NODE_ENV === "development") {
		const timestamp = new Date().toLocaleTimeString();
		const metaString = Object.keys(attributes).length
			? JSON.stringify(attributes)
			: "";

		switch (level) {
			case SeverityNumber.ERROR:
				console.error(`${timestamp} [ERROR]: ${message}`, metaString);
				break;
			case SeverityNumber.WARN:
				console.warn(`${timestamp} [WARN]: ${message}`, metaString);
				break;
			default:
				console.log(`${timestamp} [INFO]: ${message}`, metaString);
		}
	}
};

const logger = {
	info: (message: string, attributes?: Record<string, any>) => {
		emitLog(SeverityNumber.INFO, "INFO", message, attributes);
	},
	warn: (message: string, attributes?: Record<string, any>) => {
		emitLog(SeverityNumber.WARN, "WARN", message, attributes);
	},
	error: (message: string, attributes?: Record<string, any>) => {
		emitLog(SeverityNumber.ERROR, "ERROR", message, attributes);
	},
	debug: (message: string, attributes?: Record<string, any>) => {
		emitLog(SeverityNumber.DEBUG, "DEBUG", message, attributes);
	},
};

export default logger;
