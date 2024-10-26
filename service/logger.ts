import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json()
);

const schedulerTransport = new DailyRotateFile({
  filename: path.join('logs', 'scheduler', 'scheduler-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d',
  format: logFormat
});

export const schedulerLogger = winston.createLogger({
  level: 'info',
  format: logFormat,
  transports: [
    schedulerTransport,
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});