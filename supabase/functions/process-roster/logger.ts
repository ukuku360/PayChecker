type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogMetadata = Record<string, unknown>;

const LOG_LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function parseLogLevel(value: string | undefined): LogLevel {
  if (!value) return 'info';

  const normalized = value.toLowerCase();
  if (normalized === 'debug' || normalized === 'info' || normalized === 'warn' || normalized === 'error') {
    return normalized;
  }

  return 'info';
}

const configuredLevel = parseLogLevel(Deno.env.get('LOG_LEVEL'));

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVEL_WEIGHT[level] >= LOG_LEVEL_WEIGHT[configuredLevel];
}

function log(level: LogLevel, message: string, metadata?: LogMetadata): void {
  if (!shouldLog(level)) return;

  const requestId = typeof metadata?.requestId === 'string' ? metadata.requestId : undefined;
  const contextPrefix = requestId ? `[process-roster][${level.toUpperCase()}][${requestId}]` : `[process-roster][${level.toUpperCase()}]`;

  const payload = metadata ? { ...metadata } : undefined;
  if (payload && 'requestId' in payload) {
    delete payload.requestId;
  }

  if (payload && Object.keys(payload).length > 0) {
    if (level === 'error') console.error(`${contextPrefix} ${message}`, payload);
    else if (level === 'warn') console.warn(`${contextPrefix} ${message}`, payload);
    else if (level === 'info') console.info(`${contextPrefix} ${message}`, payload);
    else console.debug(`${contextPrefix} ${message}`, payload);
    return;
  }

  if (level === 'error') console.error(`${contextPrefix} ${message}`);
  else if (level === 'warn') console.warn(`${contextPrefix} ${message}`);
  else if (level === 'info') console.info(`${contextPrefix} ${message}`);
  else console.debug(`${contextPrefix} ${message}`);
}

export const logger = {
  debug: (message: string, metadata?: LogMetadata) => log('debug', message, metadata),
  info: (message: string, metadata?: LogMetadata) => log('info', message, metadata),
  warn: (message: string, metadata?: LogMetadata) => log('warn', message, metadata),
  error: (message: string, metadata?: LogMetadata) => log('error', message, metadata),
};

