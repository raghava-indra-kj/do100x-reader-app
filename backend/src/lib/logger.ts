import pino from "pino";
import { env } from "@core/config/env";

const devLoggingOptions = {
  level: "debug",
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "HH:MM:ss",
      ignore: "pid,hostname",
      singleLine: true,
    },
  },
};

const prodLoggingOptions = { level: "info" };

export const logger = pino(env.isDebug ? devLoggingOptions : prodLoggingOptions);
