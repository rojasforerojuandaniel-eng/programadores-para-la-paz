type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  [key: string]: unknown;
}

function log(level: LogLevel, message: string, context?: LogContext) {
  const timestamp = new Date().toISOString();
  const entry = {
    timestamp,
    level: level.toUpperCase(),
    message,
    ...(context || {}),
  };

  if (level === "error") {
    console.error(JSON.stringify(entry));
  } else if (level === "warn") {
    // eslint-disable-next-line no-console -- Structured JSON logs must go to stdout for serverless observability.
    console.warn(JSON.stringify(entry));
  } else {
    // eslint-disable-next-line no-console -- Structured JSON logs must go to stdout for serverless observability.
    console.log(JSON.stringify(entry));
  }
}

export const logger = {
  debug: (message: string, context?: LogContext) => log("debug", message, context),
  info: (message: string, context?: LogContext) => log("info", message, context),
  warn: (message: string, context?: LogContext) => log("warn", message, context),
  error: (message: string, context?: LogContext) => log("error", message, context),
};
