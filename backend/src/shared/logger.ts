import winston from 'winston';
import { env } from '../config/env';
import { getRequestContext } from './request-context';

const isProduction = env.NODE_ENV === 'production';

// Adds the current request's id and user to every entry logged during that request
const requestContext = winston.format((info) => {
  const context = getRequestContext();
  if (context) {
    info.requestId ??= context.requestId;
    info.userId ??= context.userId;
  }
  return info;
});

// Errors passed as fields, e.g. logger.error('msg', { error: err }), lose their message and stack
// when turned into JSON. This copies them into plain fields first.
const serializeErrors = winston.format((info) => {
  for (const [key, value] of Object.entries(info)) {
    if (value instanceof Error) {
      info[key] = { ...value, name: value.name, message: value.message, stack: value.stack };
    }
  }
  return info;
});

// Development: one coloured, readable line per entry, extra fields after the message, stack traces underneath
const readable = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const stacks: string[] = [];
    const extras = Object.entries(meta)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => {
        if (value && typeof value === 'object' && 'stack' in value && typeof value.stack === 'string') {
          stacks.push(value.stack);
          return `${key}=${'message' in value ? value.message : 'error'}`;
        }
        return `${key}=${typeof value === 'object' ? JSON.stringify(value) : value}`;
      })
      .join(' ');
    return `${timestamp} ${level} ${message}${extras ? `  ${extras}` : ''}${stacks.map((s) => `\n${s}`).join('')}`;
  }),
);

// Production: one JSON object per line, which Render's log viewer can search
const json = winston.format.combine(winston.format.timestamp(), winston.format.json());

export const logger = winston.createLogger({
  level: env.LOG_LEVEL ?? (isProduction ? 'info' : 'debug'),
  format: winston.format.combine(requestContext(), serializeErrors(), isProduction ? json : readable),
  transports: [new winston.transports.Console()],
});
