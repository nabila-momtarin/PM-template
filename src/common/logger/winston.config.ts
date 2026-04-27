import * as winston from 'winston';
import { WinstonModuleOptions } from 'nest-winston';

const devFormat = winston.format.combine(
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, context, stack, ...meta }) => {
    const ctx  = context ? `[${context}]` : '';
    const rest = Object.keys(meta).length ? '\n' + JSON.stringify(meta, null, 2) : '';
    return `${timestamp} ${level} ${ctx} ${message}${stack ? '\n' + stack : rest}`;
  }),
);

const prodFormat = winston.format.combine(
  winston.format.errors({ stack: true }),
  winston.format.timestamp(),
  winston.format.json(),
);

// Factory function — evaluated at call time so process.env is fully loaded
export const createWinstonConfig = (): WinstonModuleOptions => {
  const isDev = (process.env.NODE_ENV || 'development') === 'development';

  return {
    exitOnError: false,
    defaultMeta: {
      service:     process.env.SERVICE_NAME || 'my-service',
      environment: process.env.NODE_ENV     || 'development',
    },
    transports: [
      new winston.transports.Console({
        format: isDev ? devFormat : prodFormat,
      }),
    ],
  };
};
