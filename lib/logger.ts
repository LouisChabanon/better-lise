import winston from "winston";

const { combine, timestamp, json, printf } = winston.format;

const level = process.env.LOG_LEVEL || "info";

const logFormat = combine(timestamp(), json());

const devFormat = printf(({ level, message, timestamp, ...metadata }) => {
	let msg = `${timestamp} [${level}]: ${message} `;
	if (Object.keys(metadata).length > 0) {
		msg += JSON.stringify(metadata);
	}
	return msg;
});

const logger = winston.createLogger({
	level: level,

	format:
		process.env.NODE_ENV === "development"
			? combine(timestamp({ format: "HH:mm:ss" }), devFormat)
			: logFormat,

	transports: [
		new winston.transports.Console({
			stderrLevels: ["error"],
		}),
	],
});

export default logger;
