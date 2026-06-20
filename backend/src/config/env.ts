import "dotenv/config";
import { z } from "zod";

export enum AppEnvType {
  DEVELOPMENT = "development",
  TEST = "test",
  PRODUCTION = "production",
}

const EnvRawSchema = z.object({
  APP_ENV: z.enum(AppEnvType),
  SERVER_PORT: z.coerce.number(),
  DATABASE_URL: z.string(),
  REQUEST_BODY_JSON_LIMIT: z.string(),
  API_PREFIX: z.string(),
});
export type EnvRaw = z.infer<typeof EnvRawSchema>;

export type Env = {
  appEnv: AppEnvType;
  server: {
    port: number;
  };
  request: {
    jsonLimit: string;
  };
  api: {
    prefix: string;
  };
  database: {
    url: string;
  };
};

function rawEnvToEnv(rawEnv: EnvRaw): Env {
  return {
    appEnv: rawEnv.APP_ENV,
    server: {
      port: rawEnv.SERVER_PORT,
    },
    request: {
      jsonLimit: rawEnv.REQUEST_BODY_JSON_LIMIT,
    },
    api: {
      prefix: rawEnv.API_PREFIX,
    },
    database: {
      url: rawEnv.DATABASE_URL,
    },
  }
}

function loadEnv(): Env {
  const parsed = EnvRawSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("Invalid environment configuration:");
    for (const issue of parsed.error.issues) {
      console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
  }
  return rawEnvToEnv(parsed.data);
}

export const env = Object.freeze(loadEnv());
