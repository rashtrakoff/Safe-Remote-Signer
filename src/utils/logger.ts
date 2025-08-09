import winston from "winston";
import { config } from "../config";

// Define custom log levels
const logLevels = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
};

// Define colors for each log level
const logColors = {
    error: "red",
    warn: "yellow",
    info: "green",
    debug: "blue",
};

// Add colors to winston
winston.addColors(logColors);

// Create custom format
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.errors({ stack: true }),
    winston.format.colorize({ all: true }),
    winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
        let log = `${timestamp} [${level}]: ${message}`;

        // Add metadata if present
        if (Object.keys(meta).length > 0) {
            log += ` ${JSON.stringify(meta)}`;
        }

        // Add stack trace for errors
        if (stack) {
            log += `\n${stack}`;
        }

        return log;
    })
);

// Create logger instance
export const logger = winston.createLogger({
    levels: logLevels,
    level: config.logLevel,
    format: logFormat,
    transports: [
        // Console transport
        new winston.transports.Console({
            handleExceptions: true,
            handleRejections: true,
        }),

        // File transport for errors
        new winston.transports.File({
            filename: "logs/error.log",
            level: "error",
            maxsize: 10 * 1024 * 1024, // 10MB
            maxFiles: 5,
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.errors({ stack: true }),
                winston.format.json()
            ),
        }),

        // File transport for all logs
        new winston.transports.File({
            filename: "logs/combined.log",
            maxsize: 10 * 1024 * 1024, // 10MB
            maxFiles: 5,
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.errors({ stack: true }),
                winston.format.json()
            ),
        }),
    ],
    exitOnError: false,
});

// Create a stream object for other services (like HTTP request logging)
export const logStream = {
    write: (message: string): void => {
        logger.info(message.trim());
    },
};

// Helper functions for structured logging
export const logTransactionEvent = (
    chainId: number,
    safeTxHash: string,
    event: string,
    metadata?: any // eslint-disable-line @typescript-eslint/no-explicit-any -- Metadata can be any object
): void => {
    logger.info(`Transaction ${event}`, {
        chainId,
        safeTxHash,
        event,
        ...metadata,
    });
};

export const logChainEvent = (
    chainId: number,
    event: string,
    metadata?: any // eslint-disable-line @typescript-eslint/no-explicit-any -- Metadata can be any object
): void => {
    logger.info(`Chain ${event}`, {
        chainId,
        event,
        ...metadata,
    });
};

export const logSecurityEvent = (
    event: string,
    level: "info" | "warn" | "error" = "warn",
    metadata?: any // eslint-disable-line @typescript-eslint/no-explicit-any -- Metadata can be any object
): void => {
    logger[level](`Security: ${event}`, {
        category: "security",
        event,
        ...metadata,
    });
};

// Ensure logs directory exists
import { mkdirSync } from "fs";
try {
    mkdirSync("logs", { recursive: true });
} catch {
    // Directory already exists or permission error
}
