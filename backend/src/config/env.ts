import "dotenv/config";
import { z } from "zod";

export enum AppEnvType {
  DEVELOPMENT = "development",
  TEST = "test",
  PRODUCTION = "production",
}

const EnvRawSchema = z.object({
  APP_ENV: z.enum(AppEnvType),
  PORT: z.coerce.number(),
  DATABASE_URL: z.string(),
  API_BODY_SIZE_LIMIT: z.string(),
  API_BASE_PATH: z.string(),
});
export type EnvRaw = z.infer<typeof EnvRawSchema>;

export type Env = {
  appEnv: AppEnvType;
  server: {
    port: number;
  };
  api: {
    basePath: string;
    bodySizeLimit: string;
  };
  database: {
    url: string;
  };
};

function rawEnvToEnv(rawEnv: EnvRaw): Env {
  return {
    appEnv: rawEnv.APP_ENV,
    server: {
      port: rawEnv.PORT,
    },
    api: {
      basePath: rawEnv.API_BASE_PATH,
      bodySizeLimit: rawEnv.API_BODY_SIZE_LIMIT,
    },
    database: {
      url: rawEnv.DATABASE_URL,
    },
  };
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
