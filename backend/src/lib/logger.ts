import pino from "pino";
import { AppEnvType, env } from "@core/config/env";

const isDev = env.appEnv !== AppEnvType.PRODUCTION;

const devLogginOptions = {
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

export const logger = pino(isDev ? devLogginOptions : prodLoggingOptions);
